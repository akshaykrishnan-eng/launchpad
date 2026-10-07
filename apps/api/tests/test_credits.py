import asyncio
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.credits import CreditTransactionReason, CreditType, InsufficientCreditError
from app.core.mock_interview import InterviewType
from app.db.session import AsyncSessionLocal
from app.models.user import User
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


def test_unauthenticated_requests_are_rejected(client: TestClient) -> None:
    assert client.get("/api/v1/candidate/credits").status_code == 401
    assert client.get("/api/v1/candidate/credits/transactions").status_code == 401


def test_there_is_no_candidate_facing_way_to_grant_credit(client: TestClient) -> None:
    """Candidates must not be able to grant themselves credit (PRD
    section 38) -- there is simply no endpoint for it to call."""
    tokens = register_and_login(client, "credits.no-grant-endpoint@example.com")
    response = client.post(
        "/api/v1/candidate/credits", json={"amount": 100}, headers=auth_headers(tokens)
    )
    assert response.status_code in (404, 405)


async def test_candidate_cannot_see_another_candidates_transactions(client: TestClient) -> None:
    email_a = "credits.iso.a@example.com"
    email_b = "credits.iso.b@example.com"
    tokens_a = register_and_login(client, email_a)
    tokens_b = register_and_login(client, email_b)
    profile_a = await _profile_for(email_a)

    async with AsyncSessionLocal() as db:
        profile_a = await get_or_create_profile(db, profile_a.user_id)
        await credits_service.grant_credit(
            db,
            profile_a,
            CreditType.MOCK_INTERVIEW,
            5,
            CreditTransactionReason.PROMOTIONAL_GRANT,
        )

    b_transactions = client.get(
        "/api/v1/candidate/credits/transactions", headers=auth_headers(tokens_b)
    ).json()
    b_balances = {
        row["credit_type"]: row["balance"]
        for row in client.get(
            "/api/v1/candidate/credits", headers=auth_headers(tokens_b)
        ).json()
    }

    assert b_transactions["items"] == []
    assert b_transactions["total"] == 0
    assert b_balances["MOCK_INTERVIEW"] == 0

    a_transactions = client.get(
        "/api/v1/candidate/credits/transactions", headers=auth_headers(tokens_a)
    ).json()
    assert len(a_transactions["items"]) == 1
    assert a_transactions["total"] == 1


async def test_balance_defaults_to_zero_for_every_credit_type(client: TestClient) -> None:
    email = "credits.zero@example.com"
    tokens = register_and_login(client, email)

    response = client.get("/api/v1/candidate/credits", headers=auth_headers(tokens))

    assert response.status_code == 200
    balances = {row["credit_type"]: row["balance"] for row in response.json()}
    assert balances == {
        "MOCK_INTERVIEW": 0,
        "CAREER_COACHING": 0,
        "RESUME_REVIEW": 0,
        "LINKEDIN_REVIEW": 0,
    }


async def test_balance_sums_the_ledger(client: TestClient) -> None:
    email = "credits.sum@example.com"
    tokens = register_and_login(client, email)
    profile = await _profile_for(email)

    async with AsyncSessionLocal() as db:
        profile = await get_or_create_profile(db, profile.user_id)
        await credits_service.grant_credit(
            db, profile, CreditType.MOCK_INTERVIEW, 5, CreditTransactionReason.PROMOTIONAL_GRANT
        )
        await credits_service.grant_credit(
            db, profile, CreditType.MOCK_INTERVIEW, 2, CreditTransactionReason.PACKAGE_PURCHASE
        )

    response = client.get("/api/v1/candidate/credits", headers=auth_headers(tokens))
    balances = {row["credit_type"]: row["balance"] for row in response.json()}
    assert balances["MOCK_INTERVIEW"] == 7


async def test_grant_credit_rejects_non_positive_amounts(client: TestClient) -> None:
    email = "credits.invalid-grant@example.com"
    register_and_login(client, email)
    profile = await _profile_for(email)

    async with AsyncSessionLocal() as db:
        profile = await get_or_create_profile(db, profile.user_id)
        with pytest.raises(ValueError):
            await credits_service.grant_credit(
                db, profile, CreditType.MOCK_INTERVIEW, 0, CreditTransactionReason.PROMOTIONAL_GRANT
            )
        with pytest.raises(ValueError):
            await credits_service.grant_credit(
                db,
                profile,
                CreditType.MOCK_INTERVIEW,
                -1,
                CreditTransactionReason.PROMOTIONAL_GRANT,
            )


async def test_transaction_history_is_human_readable_and_newest_first(client: TestClient) -> None:
    email = "credits.history@example.com"
    tokens = register_and_login(client, email)
    profile = await _profile_for(email)

    async with AsyncSessionLocal() as db:
        profile = await get_or_create_profile(db, profile.user_id)
        await credits_service.grant_credit(
            db, profile, CreditType.MOCK_INTERVIEW, 3, CreditTransactionReason.PROMOTIONAL_GRANT
        )
        slot = await mock_interview_service.create_slot(
            db, InterviewType.HR, _future(), _future(hours=1)
        )
    async with AsyncSessionLocal() as db:
        profile = await get_or_create_profile(db, profile.user_id)
        await mock_interview_service.book_interview(db, profile, slot.id)

    response = client.get("/api/v1/candidate/credits/transactions", headers=auth_headers(tokens))
    body = response.json()
    rows = body["items"]

    assert response.status_code == 200
    assert body["total"] == 2
    assert len(rows) == 2
    # Newest first: the booking debit was recorded after the grant.
    assert rows[0]["amount"] == -1
    assert rows[0]["description"] == "Mock interview booking"
    assert rows[1]["amount"] == 3
    assert rows[1]["description"] == "Promotional credit"
    # Internal reference fields never leak into the API response.
    assert "reference_id" not in rows[0]
    assert "reference_type" not in rows[0]


async def test_insufficient_balance_blocks_debit(client: TestClient) -> None:
    email = "credits.insufficient@example.com"
    register_and_login(client, email)
    profile = await _profile_for(email)

    async with AsyncSessionLocal() as db:
        profile = await get_or_create_profile(db, profile.user_id)
        slot = await mock_interview_service.create_slot(
            db, InterviewType.HR, _future(), _future(hours=1)
        )

    async with AsyncSessionLocal() as db:
        profile = await get_or_create_profile(db, profile.user_id)
        with pytest.raises(InsufficientCreditError):
            await mock_interview_service.book_interview(db, profile, slot.id)

    # No transaction was recorded for the failed attempt.
    async with AsyncSessionLocal() as db:
        profile = await get_or_create_profile(db, profile.user_id)
        transactions = await credits_service.list_transactions(db, profile)
    assert transactions == []


async def test_concurrent_bookings_never_consume_more_than_one_credit(client: TestClient) -> None:
    """Candidate has exactly 1 MOCK_INTERVIEW credit and two different
    open slots; two simultaneous booking requests arrive via
    asyncio.gather, genuinely overlapping at the database (mirrors the
    Phase 5/6 concurrency tests)."""
    email = "credits.race@example.com"
    register_and_login(client, email)
    profile = await _profile_for(email)

    async with AsyncSessionLocal() as db:
        profile = await get_or_create_profile(db, profile.user_id)
        await credits_service.grant_credit(
            db, profile, CreditType.MOCK_INTERVIEW, 1, CreditTransactionReason.PROMOTIONAL_GRANT
        )
        slot_a = await mock_interview_service.create_slot(
            db, InterviewType.HR, _future(), _future(hours=1)
        )
        slot_b = await mock_interview_service.create_slot(
            db, InterviewType.HR, _future(hours=2), _future(hours=3)
        )

    async def do_book(slot_id) -> str:
        async with AsyncSessionLocal() as db:
            user = (await db.execute(select(User).where(User.email == email))).scalar_one()
            p = await get_or_create_profile(db, user.id)
            try:
                await mock_interview_service.book_interview(db, p, slot_id)
                return "booked"
            except InsufficientCreditError:
                return "insufficient"

    outcomes = await asyncio.gather(do_book(slot_a.id), do_book(slot_b.id))

    assert sorted(outcomes) == ["booked", "insufficient"]

    async with AsyncSessionLocal() as db:
        profile = await get_or_create_profile(db, profile.user_id)
        balance = await credits_service.get_balance(db, profile, CreditType.MOCK_INTERVIEW)
    assert balance == 0


async def test_transactions_are_paginated_server_side(client: TestClient) -> None:
    email = "credits.pagination@example.com"
    tokens = register_and_login(client, email)
    profile = await _profile_for(email)

    async with AsyncSessionLocal() as db:
        profile = await get_or_create_profile(db, profile.user_id)
        for _ in range(7):
            await credits_service.grant_credit(
                db, profile, CreditType.MOCK_INTERVIEW, 1, CreditTransactionReason.PROMOTIONAL_GRANT
            )

    page_1 = client.get(
        "/api/v1/candidate/credits/transactions",
        params={"page": 1, "page_size": 5},
        headers=auth_headers(tokens),
    ).json()
    page_2 = client.get(
        "/api/v1/candidate/credits/transactions",
        params={"page": 2, "page_size": 5},
        headers=auth_headers(tokens),
    ).json()

    assert page_1["total"] == 7
    assert len(page_1["items"]) == 5
    assert page_1["page"] == 1
    assert page_1["page_size"] == 5

    assert page_2["total"] == 7
    assert len(page_2["items"]) == 2
    assert page_2["page"] == 2

    # No row appears on both pages.
    page_1_ids = {row["id"] for row in page_1["items"]}
    page_2_ids = {row["id"] for row in page_2["items"]}
    assert page_1_ids.isdisjoint(page_2_ids)


async def test_transactions_page_size_defaults_and_is_clamped(client: TestClient) -> None:
    email = "credits.pagedefault@example.com"
    tokens = register_and_login(client, email)

    default_page = client.get(
        "/api/v1/candidate/credits/transactions", headers=auth_headers(tokens)
    ).json()
    assert default_page["page"] == 1
    assert default_page["page_size"] == 20

    too_large = client.get(
        "/api/v1/candidate/credits/transactions",
        params={"page_size": 500},
        headers=auth_headers(tokens),
    )
    assert too_large.status_code == 422


async def test_transactions_pagination_is_scoped_to_the_caller(client: TestClient) -> None:
    email_a = "credits.pageiso.a@example.com"
    email_b = "credits.pageiso.b@example.com"
    register_and_login(client, email_a)
    tokens_b = register_and_login(client, email_b)
    profile_a = await _profile_for(email_a)

    async with AsyncSessionLocal() as db:
        profile_a = await get_or_create_profile(db, profile_a.user_id)
        await credits_service.grant_credit(
            db, profile_a, CreditType.MOCK_INTERVIEW, 1, CreditTransactionReason.PROMOTIONAL_GRANT
        )

    b_page = client.get(
        "/api/v1/candidate/credits/transactions", headers=auth_headers(tokens_b)
    ).json()
    assert b_page["total"] == 0
    assert b_page["items"] == []
