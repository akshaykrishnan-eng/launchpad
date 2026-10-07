from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.credits import CreditTransactionReason, CreditType
from app.core.mock_interview import InterviewType
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.services import credits as credits_service
from app.services import event as event_service
from app.services import mock_interview as mock_interview_service
from app.services import notification as notification_service
from app.services.candidate_profile import get_or_create_profile
from tests.helpers import VALID_PDF_BYTES, candidate_client, role_client, upload_resume

BASE = "/api/v1/candidate/notifications"
LINKEDIN_URL = "https://linkedin.com/in/notify-person"


def _future(hours: int = 24) -> datetime:
    return datetime.now(UTC) + timedelta(hours=hours)


def _event_window() -> tuple[datetime, datetime]:
    starts_at = _future()
    return starts_at, starts_at + timedelta(hours=1)


async def _user_id(email: str):
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one()
        return user.id


async def _grant(email: str, credit_type: CreditType, amount: int = 1) -> None:
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one()
        profile = await get_or_create_profile(db, user.id)
        await credits_service.grant_credit(
            db, profile, credit_type, amount, CreditTransactionReason.PROMOTIONAL_GRANT
        )


async def _create_notification(email: str, title: str = "Test notification") -> str:
    user_id = await _user_id(email)
    async with AsyncSessionLocal() as db:
        notification = await notification_service.create_notification(
            db,
            recipient_user_id=user_id,
            type="EVENT_REGISTERED",
            title=title,
            message="A test notification message.",
        )
        return str(notification.id)


# --- Authentication / IDOR -------------------------------------------------


def test_unauthenticated_list_is_rejected(client: TestClient) -> None:
    assert client.get(BASE).status_code == 401


def test_unauthenticated_unread_count_is_rejected(client: TestClient) -> None:
    assert client.get(f"{BASE}/unread-count").status_code == 401


async def test_candidate_a_cannot_read_candidate_b_notification(client: TestClient) -> None:
    headers_a = candidate_client(client, "notif.a@example.com")
    candidate_client(client, "notif.b@example.com")
    notification_id = await _create_notification("notif.b@example.com")

    # There's no GET /{id} endpoint, so "reading" another candidate's
    # notification is exercised via the only endpoint that accepts an
    # id: mark-as-read must 404, not leak or mutate it.
    response = client.post(f"{BASE}/{notification_id}/read", headers=headers_a)
    assert response.status_code == 404


async def test_candidate_a_cannot_mark_candidate_b_notification_read(client: TestClient) -> None:
    headers_a = candidate_client(client, "notif.markA@example.com")
    candidate_client(client, "notif.markB@example.com")
    notification_id = await _create_notification("notif.markB@example.com")

    response = client.post(f"{BASE}/{notification_id}/read", headers=headers_a)
    assert response.status_code == 404

    # Still unread for its real owner.
    login_b = client.post(
        "/api/v1/auth/login",
        json={"email": "notif.markB@example.com", "password": "correct-horse-battery-staple"},
    ).json()
    headers_b = {"Authorization": f"Bearer {login_b['access_token']}"}
    listing = client.get(BASE, headers=headers_b).json()
    assert listing["items"][0]["is_read"] is False


async def test_unread_count_only_counts_own_notifications(client: TestClient) -> None:
    headers_a = candidate_client(client, "notif.countA@example.com")
    candidate_client(client, "notif.countB@example.com")
    await _create_notification("notif.countB@example.com")

    response = client.get(f"{BASE}/unread-count", headers=headers_a)
    assert response.status_code == 200
    assert response.json()["unread_count"] == 0


# --- List / pagination / empty state ---------------------------------------


async def test_empty_notification_list(client: TestClient) -> None:
    headers = candidate_client(client, "notif.empty@example.com")

    response = client.get(BASE, headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["items"] == []
    assert body["total"] == 0


async def test_list_notifications_returns_expected_fields(client: TestClient) -> None:
    email = "notif.fields@example.com"
    headers = candidate_client(client, email)
    await _create_notification(email, title="Hello")

    response = client.get(BASE, headers=headers)
    assert response.status_code == 200
    item = response.json()["items"][0]
    assert item["title"] == "Hello"
    assert item["type"] == "EVENT_REGISTERED"
    assert item["is_read"] is False
    assert "message" in item
    assert "created_at" in item


async def test_notifications_are_paginated(client: TestClient) -> None:
    email = "notif.page@example.com"
    headers = candidate_client(client, email)
    for i in range(3):
        await _create_notification(email, title=f"Notification {i}")

    first_page = client.get(BASE, params={"page": 1, "page_size": 2}, headers=headers)
    assert first_page.status_code == 200
    body = first_page.json()
    assert len(body["items"]) == 2
    assert body["total"] == 3

    second_page = client.get(BASE, params={"page": 2, "page_size": 2}, headers=headers)
    assert len(second_page.json()["items"]) == 1


async def test_notifications_newest_first(client: TestClient) -> None:
    email = "notif.order@example.com"
    headers = candidate_client(client, email)
    for i in range(3):
        await _create_notification(email, title=f"Ordered {i}")

    body = client.get(BASE, headers=headers).json()
    titles = [item["title"] for item in body["items"]]
    assert titles == ["Ordered 2", "Ordered 1", "Ordered 0"]


async def test_notifications_pages_do_not_overlap(client: TestClient) -> None:
    email = "notif.nooverlap@example.com"
    headers = candidate_client(client, email)
    for i in range(5):
        await _create_notification(email, title=f"Item {i}")

    first_page = client.get(BASE, params={"page": 1, "page_size": 2}, headers=headers).json()
    second_page = client.get(BASE, params={"page": 2, "page_size": 2}, headers=headers).json()
    third_page = client.get(BASE, params={"page": 3, "page_size": 2}, headers=headers).json()

    all_ids = [n["id"] for n in first_page["items"] + second_page["items"] + third_page["items"]]
    assert len(all_ids) == len(set(all_ids)) == 5
    assert first_page["total"] == second_page["total"] == third_page["total"] == 5


async def test_candidate_isolation_in_list(client: TestClient) -> None:
    headers_a = candidate_client(client, "notif.isoA@example.com")
    candidate_client(client, "notif.isoB@example.com")
    await _create_notification("notif.isoB@example.com", title="Belongs to B")

    body = client.get(BASE, headers=headers_a).json()
    assert body["items"] == []
    assert body["total"] == 0


# --- Status filtering (All / Unread / Read) ---------------------------------


async def test_status_filter_unread_is_globally_correct(client: TestClient) -> None:
    email = "notif.filterunread@example.com"
    headers = candidate_client(client, email)
    read_id = await _create_notification(email, title="Will be read")
    await _create_notification(email, title="Stays unread 1")
    await _create_notification(email, title="Stays unread 2")
    client.post(f"{BASE}/{read_id}/read", headers=headers)

    body = client.get(BASE, params={"status": "unread"}, headers=headers).json()
    assert body["total"] == 2
    assert all(not item["is_read"] for item in body["items"])


async def test_status_filter_read_is_globally_correct(client: TestClient) -> None:
    email = "notif.filterread@example.com"
    headers = candidate_client(client, email)
    read_id = await _create_notification(email, title="Will be read")
    await _create_notification(email, title="Stays unread")
    client.post(f"{BASE}/{read_id}/read", headers=headers)

    body = client.get(BASE, params={"status": "read"}, headers=headers).json()
    assert body["total"] == 1
    assert all(item["is_read"] for item in body["items"])


async def test_status_filter_all_includes_everything(client: TestClient) -> None:
    email = "notif.filterall@example.com"
    headers = candidate_client(client, email)
    read_id = await _create_notification(email, title="Will be read")
    await _create_notification(email, title="Stays unread")
    client.post(f"{BASE}/{read_id}/read", headers=headers)

    body = client.get(BASE, params={"status": "all"}, headers=headers).json()
    assert body["total"] == 2


async def test_status_filter_paginates_independently(client: TestClient) -> None:
    email = "notif.filterpage@example.com"
    headers = candidate_client(client, email)
    for i in range(3):
        await _create_notification(email, title=f"Unread {i}")

    page1 = client.get(
        BASE, params={"status": "unread", "page": 1, "page_size": 2}, headers=headers
    ).json()
    page2 = client.get(
        BASE, params={"status": "unread", "page": 2, "page_size": 2}, headers=headers
    ).json()

    assert len(page1["items"]) == 2
    assert len(page2["items"]) == 1
    assert page1["total"] == page2["total"] == 3


async def test_unread_count_is_global_not_page_specific(client: TestClient) -> None:
    email = "notif.globalcount@example.com"
    headers = candidate_client(client, email)
    for i in range(20):
        await _create_notification(email, title=f"N{i}")

    # Request only the first page of 15; the unread-count endpoint must
    # still report all 20, not the 15 on this page.
    client.get(BASE, params={"page": 1, "page_size": 15}, headers=headers)
    unread = client.get(f"{BASE}/unread-count", headers=headers).json()
    assert unread["unread_count"] == 20


# --- Mark as read / mark all as read ----------------------------------------


async def test_mark_notification_read(client: TestClient) -> None:
    email = "notif.read@example.com"
    headers = candidate_client(client, email)
    notification_id = await _create_notification(email)

    before = client.get(f"{BASE}/unread-count", headers=headers).json()
    assert before["unread_count"] == 1

    response = client.post(f"{BASE}/{notification_id}/read", headers=headers)
    assert response.status_code == 200
    assert response.json()["is_read"] is True

    after = client.get(f"{BASE}/unread-count", headers=headers).json()
    assert after["unread_count"] == 0


async def test_marking_already_read_notification_is_idempotent(client: TestClient) -> None:
    email = "notif.idempotent@example.com"
    headers = candidate_client(client, email)
    notification_id = await _create_notification(email)

    first = client.post(f"{BASE}/{notification_id}/read", headers=headers)
    second = client.post(f"{BASE}/{notification_id}/read", headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["is_read"] is True
    # read_at is stable across the second (no-op) call.
    assert first.json()["read_at"] == second.json()["read_at"]


async def test_mark_missing_notification_404s(client: TestClient) -> None:
    import uuid

    headers = candidate_client(client, "notif.missing@example.com")
    response = client.post(f"{BASE}/{uuid.uuid4()}/read", headers=headers)
    assert response.status_code == 404


async def test_mark_all_read_only_affects_own_unread_notifications(client: TestClient) -> None:
    email_a = "notif.allA@example.com"
    email_b = "notif.allB@example.com"
    headers_a = candidate_client(client, email_a)
    candidate_client(client, email_b)
    await _create_notification(email_a, title="A1")
    await _create_notification(email_a, title="A2")
    await _create_notification(email_b, title="B1")

    response = client.post(f"{BASE}/read-all", headers=headers_a)
    assert response.status_code == 200
    assert response.json()["marked_read"] == 2

    assert client.get(f"{BASE}/unread-count", headers=headers_a).json()["unread_count"] == 0

    login_b = client.post(
        "/api/v1/auth/login",
        json={"email": email_b, "password": "correct-horse-battery-staple"},
    ).json()
    headers_b = {"Authorization": f"Bearer {login_b['access_token']}"}
    assert client.get(f"{BASE}/unread-count", headers=headers_b).json()["unread_count"] == 1


async def test_mark_all_read_is_a_no_op_when_nothing_is_unread(client: TestClient) -> None:
    headers = candidate_client(client, "notif.allnoop@example.com")

    response = client.post(f"{BASE}/read-all", headers=headers)
    assert response.status_code == 200
    assert response.json()["marked_read"] == 0


# --- Workflow integration ---------------------------------------------------


async def test_event_registration_creates_notification(client: TestClient) -> None:
    email = "notif.event@example.com"
    headers = candidate_client(client, email)
    starts_at, ends_at = _event_window()
    async with AsyncSessionLocal() as db:
        event = await event_service.create_event(
            db,
            title="Resume Writing Workshop",
            description="Learn to write a great resume.",
            event_type="WEBINAR",
            starts_at=starts_at,
            ends_at=ends_at,
            timezone="UTC",
            location=None,
            meeting_url="https://zoom.us/j/1",
            status="PUBLISHED",
        )

    client.post(f"/api/v1/candidate/events/{event.id}/register", headers=headers)

    notifications = client.get(BASE, headers=headers).json()["items"]
    assert any(
        n["type"] == "EVENT_REGISTERED" and "Resume Writing Workshop" in n["message"]
        for n in notifications
    )


async def test_duplicate_event_registration_does_not_duplicate_notification(
    client: TestClient,
) -> None:
    """Duplicate registration is already rejected with 409 by the
    existing idempotency guard, before any notification is created --
    so retrying never creates a second notification."""
    email = "notif.eventdup@example.com"
    headers = candidate_client(client, email)
    starts_at, ends_at = _event_window()
    async with AsyncSessionLocal() as db:
        event = await event_service.create_event(
            db,
            title="Dup Notification Webinar",
            description="desc",
            event_type="WEBINAR",
            starts_at=starts_at,
            ends_at=ends_at,
            timezone="UTC",
            location=None,
            meeting_url="https://zoom.us/j/2",
            status="PUBLISHED",
        )

    client.post(f"/api/v1/candidate/events/{event.id}/register", headers=headers)
    second = client.post(f"/api/v1/candidate/events/{event.id}/register", headers=headers)
    assert second.status_code == 409

    notifications = client.get(BASE, headers=headers).json()["items"]
    matching = [n for n in notifications if n["type"] == "EVENT_REGISTERED"]
    assert len(matching) == 1


async def test_mock_interview_booking_creates_notification(client: TestClient) -> None:
    email = "notif.interview@example.com"
    headers = candidate_client(client, email)
    await _grant(email, CreditType.MOCK_INTERVIEW)
    async with AsyncSessionLocal() as db:
        slot = await mock_interview_service.create_slot(
            db, InterviewType.HR, _future(), _future(hours=25)
        )

    client.post(
        "/api/v1/candidate/mock-interviews/book",
        headers=headers,
        json={"slot_id": str(slot.id)},
    )

    notifications = client.get(BASE, headers=headers).json()["items"]
    assert any(n["type"] == "MOCK_INTERVIEW_BOOKED" for n in notifications)


async def test_resume_review_completion_creates_notification(client: TestClient) -> None:
    admin_headers = await role_client(client, "notif.resumeadmin@example.com", "ADMIN")
    email = "notif.resumecandidate@example.com"
    candidate_headers = candidate_client(client, email)
    await _grant(email, CreditType.RESUME_REVIEW)
    upload_resume(client, candidate_headers, "resume.pdf", VALID_PDF_BYTES, "application/pdf")
    resume_id = client.get(
        "/api/v1/candidate/resumes", headers=candidate_headers
    ).json()[0]["id"]
    review_id = client.post(
        f"/api/v1/candidate/resumes/{resume_id}/review", headers=candidate_headers
    ).json()["id"]

    client.post(
        f"/api/v1/admin/resume-reviews/{review_id}/complete",
        headers=admin_headers,
        json={"score": 85, "summary": "Solid resume overall."},
    )

    notifications = client.get(BASE, headers=candidate_headers).json()["items"]
    assert any(n["type"] == "RESUME_REVIEW_COMPLETED" for n in notifications)


async def test_resume_review_double_completion_does_not_duplicate_notification(
    client: TestClient,
) -> None:
    admin_headers = await role_client(client, "notif.resumeadmin2@example.com", "ADMIN")
    email = "notif.resumecandidate2@example.com"
    candidate_headers = candidate_client(client, email)
    await _grant(email, CreditType.RESUME_REVIEW)
    upload_resume(client, candidate_headers, "resume.pdf", VALID_PDF_BYTES, "application/pdf")
    resume_id = client.get(
        "/api/v1/candidate/resumes", headers=candidate_headers
    ).json()[0]["id"]
    review_id = client.post(
        f"/api/v1/candidate/resumes/{resume_id}/review", headers=candidate_headers
    ).json()["id"]

    payload = {"score": 70, "summary": "Fine."}
    complete_url = f"/api/v1/admin/resume-reviews/{review_id}/complete"
    client.post(complete_url, headers=admin_headers, json=payload)
    second = client.post(complete_url, headers=admin_headers, json=payload)
    assert second.status_code == 409

    notifications = client.get(BASE, headers=candidate_headers).json()["items"]
    matching = [n for n in notifications if n["type"] == "RESUME_REVIEW_COMPLETED"]
    assert len(matching) == 1


async def test_linkedin_review_completion_creates_notification(client: TestClient) -> None:
    admin_headers = await role_client(client, "notif.liadmin@example.com", "ADMIN")
    email = "notif.licandidate@example.com"
    candidate_headers = candidate_client(client, email)
    await _grant(email, CreditType.LINKEDIN_REVIEW)
    client.put(
        "/api/v1/candidate/linkedin", headers=candidate_headers, json={"profile_url": LINKEDIN_URL}
    )
    review_id = client.post(
        "/api/v1/candidate/linkedin/review", headers=candidate_headers
    ).json()["id"]

    client.post(
        f"/api/v1/admin/linkedin-reviews/{review_id}/complete",
        headers=admin_headers,
        json={"score": 78, "summary": "Good headline, needs a summary."},
    )

    notifications = client.get(BASE, headers=candidate_headers).json()["items"]
    assert any(n["type"] == "LINKEDIN_REVIEW_COMPLETED" for n in notifications)


async def test_notification_creation_failure_does_not_break_event_registration(
    client: TestClient, monkeypatch
) -> None:
    """Even if notification creation itself blows up, the primary
    operation (event registration) must still succeed -- see
    notification_service.create_notification_safe."""

    async def _boom(*args, **kwargs):
        raise RuntimeError("simulated notification outage")

    monkeypatch.setattr(notification_service, "create_notification", _boom)

    email = "notif.failsafe@example.com"
    headers = candidate_client(client, email)
    starts_at, ends_at = _event_window()
    async with AsyncSessionLocal() as db:
        event = await event_service.create_event(
            db,
            title="Failsafe Webinar",
            description="desc",
            event_type="WEBINAR",
            starts_at=starts_at,
            ends_at=ends_at,
            timezone="UTC",
            location=None,
            meeting_url="https://zoom.us/j/3",
            status="PUBLISHED",
        )

    response = client.post(f"/api/v1/candidate/events/{event.id}/register", headers=headers)
    assert response.status_code == 201
    assert response.json()["registered"] is True
