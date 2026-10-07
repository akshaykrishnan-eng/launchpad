from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient

from app.core.event import EventStatus, EventType
from app.db.session import AsyncSessionLocal
from app.services import event as event_service
from tests.helpers import candidate_client, role_client

ADMIN_BASE = "/api/v1/admin/events"
CANDIDATE_BASE = "/api/v1/candidate/events"


def _future(hours: int = 24) -> datetime:
    return datetime.now(UTC) + timedelta(hours=hours)


def _past(hours: int = 24) -> datetime:
    return datetime.now(UTC) - timedelta(hours=hours)


async def _create_event(
    *,
    title: str = "Breaking Into Product Engineering",
    status: EventStatus = EventStatus.PUBLISHED,
    starts_at: datetime | None = None,
    ends_at: datetime | None = None,
    event_type: EventType = EventType.WEBINAR,
):
    resolved_starts_at = starts_at or _future()
    resolved_ends_at = ends_at or (resolved_starts_at + timedelta(hours=1))
    async with AsyncSessionLocal() as db:
        return await event_service.create_event(
            db,
            title=title,
            description="Learn what hiring teams look for.",
            event_type=event_type,
            starts_at=resolved_starts_at,
            ends_at=resolved_ends_at,
            timezone="Asia/Kolkata",
            location=None,
            meeting_url="https://zoom.us/j/123",
            status=status,
        )


async def _admin_headers(client: TestClient, email: str = "events.admin@example.com") -> dict:
    return await role_client(client, email, "ADMIN")


# --- Candidate: visibility -------------------------------------------------


def test_unauthenticated_candidate_access_is_rejected(client: TestClient) -> None:
    assert client.get(CANDIDATE_BASE).status_code == 401


async def test_draft_events_are_hidden_from_candidates(client: TestClient) -> None:
    await _create_event(title="Secret Draft", status=EventStatus.DRAFT)
    headers = candidate_client(client, "events.draft@example.com")

    response = client.get(CANDIDATE_BASE, headers=headers)
    assert response.status_code == 200
    assert all(e["title"] != "Secret Draft" for e in response.json())


async def test_draft_event_detail_404s_for_candidate(client: TestClient) -> None:
    event = await _create_event(title="Secret Draft 2", status=EventStatus.DRAFT)
    headers = candidate_client(client, "events.draft2@example.com")

    response = client.get(f"{CANDIDATE_BASE}/{event.id}", headers=headers)
    assert response.status_code == 404


async def test_published_upcoming_event_is_visible_and_registerable(client: TestClient) -> None:
    event = await _create_event(title="Upcoming Webinar")
    headers = candidate_client(client, "events.upcoming@example.com")

    response = client.get(CANDIDATE_BASE, headers=headers)
    assert response.status_code == 200
    items = response.json()
    match = next(e for e in items if e["id"] == str(event.id))
    assert match["status"] == "PUBLISHED"
    assert match["is_registered"] is False


async def test_past_published_event_reads_as_completed(client: TestClient) -> None:
    event = await _create_event(
        title="Past Webinar", starts_at=_past(hours=2), ends_at=_past(hours=1)
    )
    headers = candidate_client(client, "events.past@example.com")

    response = client.get(f"{CANDIDATE_BASE}/{event.id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "COMPLETED"


# --- Candidate: registration -----------------------------------------------


async def test_unauthenticated_registration_is_rejected(client: TestClient) -> None:
    event = await _create_event(title="Reg Auth Webinar")
    assert client.post(f"{CANDIDATE_BASE}/{event.id}/register").status_code == 401


async def test_candidate_can_register_for_upcoming_event(client: TestClient) -> None:
    event = await _create_event(title="Register Me")
    headers = candidate_client(client, "events.register@example.com")

    response = client.post(f"{CANDIDATE_BASE}/{event.id}/register", headers=headers)
    assert response.status_code == 201
    assert response.json()["registered"] is True

    detail = client.get(f"{CANDIDATE_BASE}/{event.id}", headers=headers)
    assert detail.json()["is_registered"] is True


async def test_duplicate_registration_is_rejected(client: TestClient) -> None:
    event = await _create_event(title="Dup Reg")
    headers = candidate_client(client, "events.dup@example.com")

    first = client.post(f"{CANDIDATE_BASE}/{event.id}/register", headers=headers)
    assert first.status_code == 201

    second = client.post(f"{CANDIDATE_BASE}/{event.id}/register", headers=headers)
    assert second.status_code == 409


async def test_cannot_register_for_draft_event(client: TestClient) -> None:
    event = await _create_event(title="Draft Reg", status=EventStatus.DRAFT)
    headers = candidate_client(client, "events.draftreg@example.com")

    response = client.post(f"{CANDIDATE_BASE}/{event.id}/register", headers=headers)
    assert response.status_code == 404


async def test_cannot_register_for_cancelled_event(client: TestClient) -> None:
    event = await _create_event(title="Cancelled Reg", status=EventStatus.CANCELLED)
    headers = candidate_client(client, "events.cancelreg@example.com")

    response = client.post(f"{CANDIDATE_BASE}/{event.id}/register", headers=headers)
    assert response.status_code == 409


async def test_cannot_register_for_past_event(client: TestClient) -> None:
    event = await _create_event(
        title="Past Reg", starts_at=_past(hours=2), ends_at=_past(hours=1)
    )
    headers = candidate_client(client, "events.pastreg@example.com")

    response = client.post(f"{CANDIDATE_BASE}/{event.id}/register", headers=headers)
    assert response.status_code == 409


async def test_registering_for_missing_event_404s(client: TestClient) -> None:
    import uuid

    headers = candidate_client(client, "events.missing@example.com")
    response = client.post(f"{CANDIDATE_BASE}/{uuid.uuid4()}/register", headers=headers)
    assert response.status_code == 404


async def test_candidate_cannot_see_another_candidates_registration_state(
    client: TestClient,
) -> None:
    """IDOR-style isolation: candidate B registering doesn't flip
    is_registered for candidate A, and there's no client-controllable
    parameter that could be used to check another candidate's state."""
    event = await _create_event(title="Isolation Webinar")
    headers_a = candidate_client(client, "events.isoA@example.com")
    headers_b = candidate_client(client, "events.isoB@example.com")

    client.post(f"{CANDIDATE_BASE}/{event.id}/register", headers=headers_b)

    detail_a = client.get(f"{CANDIDATE_BASE}/{event.id}", headers=headers_a)
    assert detail_a.json()["is_registered"] is False


# --- Admin: authorization --------------------------------------------------


def test_unauthenticated_admin_access_is_rejected(client: TestClient) -> None:
    assert client.get(ADMIN_BASE).status_code == 401


async def test_candidate_cannot_access_admin_events_api(client: TestClient) -> None:
    headers = candidate_client(client, "events.admindenied@example.com")
    assert client.get(ADMIN_BASE, headers=headers).status_code == 403
    assert client.post(ADMIN_BASE, json={}, headers=headers).status_code == 403


# --- Admin: CRUD + lifecycle ------------------------------------------------


async def test_admin_can_create_and_list_events(client: TestClient) -> None:
    headers = await _admin_headers(client)
    starts_at = _future()
    payload = {
        "title": "Admin Created Event",
        "description": "Some description",
        "event_type": "WEBINAR",
        "starts_at": starts_at.isoformat(),
        "ends_at": (starts_at + timedelta(hours=1)).isoformat(),
        "timezone": "Asia/Kolkata",
        "meeting_url": "https://zoom.us/j/999",
        "status": "DRAFT",
    }
    create = client.post(ADMIN_BASE, json=payload, headers=headers)
    assert create.status_code == 201
    event_id = create.json()["id"]
    assert create.json()["status"] == "DRAFT"
    assert create.json()["registration_count"] == 0

    listing = client.get(ADMIN_BASE, headers=headers)
    assert listing.status_code == 200
    assert any(e["id"] == event_id for e in listing.json()["items"])


async def test_invalid_event_dates_are_rejected(client: TestClient) -> None:
    headers = await _admin_headers(client)
    payload = {
        "title": "Bad Dates",
        "description": "desc",
        "event_type": "EVENT",
        "starts_at": _future(hours=2).isoformat(),
        "ends_at": _future(hours=1).isoformat(),
        "timezone": "UTC",
    }
    response = client.post(ADMIN_BASE, json=payload, headers=headers)
    assert response.status_code == 422


async def test_admin_can_edit_event(client: TestClient) -> None:
    headers = await _admin_headers(client)
    event = await _create_event(title="Editable", status=EventStatus.DRAFT)

    response = client.patch(
        f"{ADMIN_BASE}/{event.id}", json={"title": "Edited Title"}, headers=headers
    )
    assert response.status_code == 200
    assert response.json()["title"] == "Edited Title"


async def test_admin_edit_rejects_invalid_dates(client: TestClient) -> None:
    headers = await _admin_headers(client)
    event = await _create_event(title="Editable Dates", status=EventStatus.DRAFT)

    response = client.patch(
        f"{ADMIN_BASE}/{event.id}",
        json={"starts_at": _future(hours=5).isoformat(), "ends_at": _future(hours=1).isoformat()},
        headers=headers,
    )
    assert response.status_code == 422


async def test_admin_can_publish_and_unpublish(client: TestClient) -> None:
    headers = await _admin_headers(client)
    event = await _create_event(title="Publish Me", status=EventStatus.DRAFT)

    publish = client.post(f"{ADMIN_BASE}/{event.id}/publish", headers=headers)
    assert publish.status_code == 200
    assert publish.json()["status"] == "PUBLISHED"

    unpublish = client.post(f"{ADMIN_BASE}/{event.id}/unpublish", headers=headers)
    assert unpublish.status_code == 200
    assert unpublish.json()["status"] == "DRAFT"


async def test_admin_can_cancel_event(client: TestClient) -> None:
    headers = await _admin_headers(client)
    event = await _create_event(title="Cancel Me")

    response = client.post(f"{ADMIN_BASE}/{event.id}/cancel", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "CANCELLED"

    second = client.post(f"{ADMIN_BASE}/{event.id}/cancel", headers=headers)
    assert second.status_code == 409


async def test_admin_can_view_registrations_and_count(client: TestClient) -> None:
    admin_headers = await _admin_headers(client)
    event = await _create_event(title="Registrations Webinar")

    candidate_headers = candidate_client(client, "events.regview@example.com")
    client.post(f"{CANDIDATE_BASE}/{event.id}/register", headers=candidate_headers)

    detail = client.get(f"{ADMIN_BASE}/{event.id}", headers=admin_headers)
    assert detail.status_code == 200
    assert detail.json()["registration_count"] == 1

    registrations = client.get(f"{ADMIN_BASE}/{event.id}/registrations", headers=admin_headers)
    assert registrations.status_code == 200
    body = registrations.json()
    assert body["total"] == 1
    assert body["items"][0]["candidate"]["email"] == "events.regview@example.com"
