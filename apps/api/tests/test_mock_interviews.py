import asyncio
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from app.core.credits import CreditTransactionReason, CreditType
from app.core.mock_interview import InterviewType
from app.db.session import AsyncSessionLocal
from app.models.mock_interview import MockInterview
from app.models.role import Role
from app.models.user import User
from app.models.user_role import UserRole
from app.services import credits as credits_service
from app.services import mock_interview as mock_interview_service
from app.services.candidate_profile import get_or_create_profile
from tests.helpers import auth_headers, register_and_login


def _future(hours: int = 24) -> datetime:
    return datetime.now(UTC) + timedelta(hours=hours)


async def _profile_for(email: str):
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one()
        return await get_or_create_profile(db, user.id)


async def _grant(email: str, credit_type: CreditType, amount: int) -> None:
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one()
        profile = await get_or_create_profile(db, user.id)
        await credits_service.grant_credit(
            db, profile, credit_type, amount, CreditTransactionReason.PROMOTIONAL_GRANT
        )


async def _create_slot(interview_type: InterviewType = InterviewType.HR):
    async with AsyncSessionLocal() as db:
        return await mock_interview_service.create_slot(
            db, interview_type, _future(), _future(hours=1)
        )


def test_unauthenticated_requests_are_rejected(client: TestClient) -> None:
    assert client.get("/api/v1/candidate/mock-interviews").status_code == 401
    assert client.get("/api/v1/candidate/mock-interviews/slots").status_code == 401
    assert client.post("/api/v1/candidate/mock-interviews/book", json={}).status_code == 401


async def test_non_candidate_role_is_rejected(client: TestClient) -> None:
    email = "mi.interviewer@example.com"
    register_and_login(client, email)

    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one()
        await db.execute(delete(UserRole).where(UserRole.user_id == user.id))
        interviewer_role = (
            await db.execute(select(Role).where(Role.name == "INTERVIEWER"))
        ).scalar_one()
        db.add(UserRole(user_id=user.id, role_id=interviewer_role.id))
        await db.commit()

    tokens = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "correct-horse-battery-staple"},
    ).json()

    response = client.get("/api/v1/candidate/mock-interviews", headers=auth_headers(tokens))
    assert response.status_code == 403


async def test_lists_only_open_future_slots_of_the_requested_type(client: TestClient) -> None:
    email = "mi.slots@example.com"
    tokens = register_and_login(client, email)

    open_hr = await _create_slot(InterviewType.HR)
    await _create_slot(InterviewType.TECHNICAL)

    async with AsyncSessionLocal() as db:
        past_slot = await mock_interview_service.create_slot(
            db, InterviewType.HR, _future(hours=-5), _future(hours=-4)
        )

    response = client.get(
        "/api/v1/candidate/mock-interviews/slots",
        params={"interview_type": "HR"},
        headers=auth_headers(tokens),
    )
    slot_ids = {row["id"] for row in response.json()}

    assert response.status_code == 200
    assert str(open_hr.id) in slot_ids
    assert str(past_slot.id) not in slot_ids


async def test_role_specific_booking_requires_a_role(client: TestClient) -> None:
    email = "mi.role-required@example.com"
    tokens = register_and_login(client, email)
    await _grant(email, CreditType.MOCK_INTERVIEW, 1)
    slot = await _create_slot(InterviewType.ROLE_SPECIFIC)

    response = client.post(
        "/api/v1/candidate/mock-interviews/book",
        json={"slot_id": str(slot.id)},
        headers=auth_headers(tokens),
    )

    assert response.status_code == 422


async def test_books_an_open_slot_and_deducts_one_credit(client: TestClient) -> None:
    email = "mi.book@example.com"
    tokens = register_and_login(client, email)
    await _grant(email, CreditType.MOCK_INTERVIEW, 1)
    slot = await _create_slot(InterviewType.HR)

    response = client.post(
        "/api/v1/candidate/mock-interviews/book",
        json={"slot_id": str(slot.id)},
        headers=auth_headers(tokens),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "BOOKED"
    assert body["interview_type"] == "HR"

    balances = client.get(
        "/api/v1/candidate/credits", headers=auth_headers(tokens)
    ).json()
    mock_interview_balance = next(
        b["balance"] for b in balances if b["credit_type"] == "MOCK_INTERVIEW"
    )
    assert mock_interview_balance == 0


async def test_booking_without_enough_credit_is_rejected(client: TestClient) -> None:
    email = "mi.no-credit@example.com"
    tokens = register_and_login(client, email)
    slot = await _create_slot(InterviewType.HR)

    response = client.post(
        "/api/v1/candidate/mock-interviews/book",
        json={"slot_id": str(slot.id)},
        headers=auth_headers(tokens),
    )

    assert response.status_code == 409


async def test_booking_an_already_booked_slot_is_rejected(client: TestClient) -> None:
    email = "mi.duplicate@example.com"
    tokens = register_and_login(client, email)
    await _grant(email, CreditType.MOCK_INTERVIEW, 2)
    slot = await _create_slot(InterviewType.HR)

    first = client.post(
        "/api/v1/candidate/mock-interviews/book",
        json={"slot_id": str(slot.id)},
        headers=auth_headers(tokens),
    )
    second = client.post(
        "/api/v1/candidate/mock-interviews/book",
        json={"slot_id": str(slot.id)},
        headers=auth_headers(tokens),
    )

    assert first.status_code == 201
    assert second.status_code == 409
    # Only one credit was ever consumed, even though a second booking
    # attempt was made against the same (by-then-unavailable) slot.
    balances = client.get(
        "/api/v1/candidate/credits", headers=auth_headers(tokens)
    ).json()
    mock_interview_balance = next(
        b["balance"] for b in balances if b["credit_type"] == "MOCK_INTERVIEW"
    )
    assert mock_interview_balance == 1


async def test_two_candidates_racing_for_one_slot_only_one_wins(client: TestClient) -> None:
    """Mirrors Phase 5/6's concurrency tests: two separate DB sessions,
    two different candidates, booking the same slot at the same time
    via asyncio.gather, genuinely overlapping at the database."""
    email_a = "mi.race.a@example.com"
    email_b = "mi.race.b@example.com"
    register_and_login(client, email_a)
    register_and_login(client, email_b)
    await _grant(email_a, CreditType.MOCK_INTERVIEW, 1)
    await _grant(email_b, CreditType.MOCK_INTERVIEW, 1)
    slot = await _create_slot(InterviewType.HR)

    async def do_book(email: str) -> str:
        async with AsyncSessionLocal() as db:
            user = (await db.execute(select(User).where(User.email == email))).scalar_one()
            profile = await get_or_create_profile(db, user.id)
            try:
                await mock_interview_service.book_interview(db, profile, slot.id)
                return "booked"
            except Exception:  # noqa: BLE001 - either SlotUnavailableError or DuplicateBookingError
                return "rejected"

    outcomes = await asyncio.gather(do_book(email_a), do_book(email_b))

    assert sorted(outcomes) == ["booked", "rejected"]

    async with AsyncSessionLocal() as db:
        rows = (
            await db.execute(select(MockInterview).where(MockInterview.slot_id == slot.id))
        ).scalars().all()
    assert len(rows) == 1


async def test_candidate_cannot_see_another_candidates_interviews(client: TestClient) -> None:
    email_a = "mi.iso.a@example.com"
    email_b = "mi.iso.b@example.com"
    tokens_a = register_and_login(client, email_a)
    tokens_b = register_and_login(client, email_b)
    await _grant(email_a, CreditType.MOCK_INTERVIEW, 1)
    slot = await _create_slot(InterviewType.HR)

    booked = client.post(
        "/api/v1/candidate/mock-interviews/book",
        json={"slot_id": str(slot.id)},
        headers=auth_headers(tokens_a),
    ).json()

    # B's own list is empty.
    b_list = client.get(
        "/api/v1/candidate/mock-interviews", headers=auth_headers(tokens_b)
    ).json()
    assert b_list == []

    # B cannot fetch A's interview directly by id.
    response = client.get(
        f"/api/v1/candidate/mock-interviews/{booked['id']}", headers=auth_headers(tokens_b)
    )
    assert response.status_code == 404

    # A can see it.
    a_get = client.get(
        f"/api/v1/candidate/mock-interviews/{booked['id']}", headers=auth_headers(tokens_a)
    )
    assert a_get.status_code == 200


async def test_feedback_is_null_until_completed_then_visible_only_to_the_owner(
    client: TestClient,
) -> None:
    email_a = "mi.feedback.a@example.com"
    email_b = "mi.feedback.b@example.com"
    tokens_a = register_and_login(client, email_a)
    tokens_b = register_and_login(client, email_b)
    await _grant(email_a, CreditType.MOCK_INTERVIEW, 1)
    slot = await _create_slot(InterviewType.HR)

    booked = client.post(
        "/api/v1/candidate/mock-interviews/book",
        json={"slot_id": str(slot.id)},
        headers=auth_headers(tokens_a),
    ).json()

    before = client.get(
        f"/api/v1/candidate/mock-interviews/{booked['id']}/feedback",
        headers=auth_headers(tokens_a),
    )
    assert before.status_code == 200
    assert before.json() is None

    profile_a = await _profile_for(email_a)
    async with AsyncSessionLocal() as db:
        interview = await mock_interview_service.get_owned_interview(
            db, profile_a, uuid.UUID(booked["id"])
        )
        await mock_interview_service.complete_interview(
            db,
            interview,
            communication_score=8,
            confidence_score=7,
            technical_score=9,
            answer_structure_score=8,
            professional_presentation_score=8,
            overall_score=82,
            feedback="Strong technical answers, work on pacing.",
            recommendations=["Practice the STAR method"],
        )

    after = client.get(
        f"/api/v1/candidate/mock-interviews/{booked['id']}/feedback",
        headers=auth_headers(tokens_a),
    )
    assert after.status_code == 200
    assert after.json()["overall_score"] == 82

    forbidden = client.get(
        f"/api/v1/candidate/mock-interviews/{booked['id']}/feedback",
        headers=auth_headers(tokens_b),
    )
    assert forbidden.status_code == 404


async def test_feedback_scores_out_of_range_are_rejected(client: TestClient) -> None:
    email = "mi.bad-score@example.com"
    register_and_login(client, email)
    await _grant(email, CreditType.MOCK_INTERVIEW, 1)
    slot = await _create_slot(InterviewType.HR)
    profile = await _profile_for(email)

    async with AsyncSessionLocal() as db:
        profile = await get_or_create_profile(db, profile.user_id)
        interview = await mock_interview_service.book_interview(db, profile, slot.id)

        with pytest.raises(ValueError):
            await mock_interview_service.complete_interview(
                db,
                interview,
                communication_score=11,
                confidence_score=7,
                technical_score=9,
                answer_structure_score=8,
                professional_presentation_score=8,
                overall_score=82,
                feedback="Invalid score test.",
            )
        with pytest.raises(ValueError):
            await mock_interview_service.complete_interview(
                db,
                interview,
                communication_score=8,
                confidence_score=7,
                technical_score=9,
                answer_structure_score=8,
                professional_presentation_score=8,
                overall_score=101,
                feedback="Invalid overall score test.",
            )
