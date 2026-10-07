import asyncio

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.credits import CreditTransactionReason, CreditType, InsufficientCreditError
from app.core.review import ReviewerType
from app.db.session import AsyncSessionLocal
from app.models.linkedin_review_request import LinkedInReviewRequest
from app.models.user import User
from app.services import credits as credits_service
from app.services import linkedin as linkedin_service
from app.services import linkedin_review as linkedin_review_service
from app.services.candidate_profile import get_or_create_profile
from tests.helpers import candidate_client, register_and_login

VALID_URL = "https://linkedin.com/in/review-person"


async def _grant_linkedin_review_credit(email: str, amount: int = 1) -> None:
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one()
        profile = await get_or_create_profile(db, user.id)
        await credits_service.grant_credit(
            db,
            profile,
            CreditType.LINKEDIN_REVIEW,
            amount,
            CreditTransactionReason.PROMOTIONAL_GRANT,
        )


async def test_request_review_succeeds(client: TestClient) -> None:
    email = "li.review.request@example.com"
    headers = candidate_client(client, email)
    client.put("/api/v1/candidate/linkedin", headers=headers, json={"profile_url": VALID_URL})
    await _grant_linkedin_review_credit(email)

    response = client.post("/api/v1/candidate/linkedin/review", headers=headers)

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "REQUESTED"
    assert body["profile_url_snapshot"] == VALID_URL
    assert body["result"] is None


async def test_review_request_deducts_one_linkedin_review_credit(client: TestClient) -> None:
    email = "li.review.deducts@example.com"
    headers = candidate_client(client, email)
    client.put("/api/v1/candidate/linkedin", headers=headers, json={"profile_url": VALID_URL})
    await _grant_linkedin_review_credit(email)

    client.post("/api/v1/candidate/linkedin/review", headers=headers)

    balances = client.get("/api/v1/candidate/credits", headers=headers).json()
    linkedin_review_balance = next(
        b["balance"] for b in balances if b["credit_type"] == "LINKEDIN_REVIEW"
    )
    assert linkedin_review_balance == 0


async def test_review_request_without_credit_is_rejected(client: TestClient) -> None:
    email = "li.review.nocredit@example.com"
    headers = candidate_client(client, email)
    client.put("/api/v1/candidate/linkedin", headers=headers, json={"profile_url": VALID_URL})

    response = client.post("/api/v1/candidate/linkedin/review", headers=headers)

    assert response.status_code == 409
    get_response = client.get("/api/v1/candidate/linkedin/review", headers=headers)
    assert get_response.json() is None
    balances = client.get("/api/v1/candidate/credits", headers=headers).json()
    linkedin_review_balance = next(
        b["balance"] for b in balances if b["credit_type"] == "LINKEDIN_REVIEW"
    )
    assert linkedin_review_balance == 0


async def test_insufficient_credit_leaves_no_review_request_and_no_lost_credit(
    client: TestClient,
) -> None:
    email = "li.review.insufficient@example.com"
    register_and_login(client, email)

    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one()
        profile = await get_or_create_profile(db, user.id)
        await linkedin_service.upsert_profile(db, profile, VALID_URL)

    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one()
        profile = await get_or_create_profile(db, user.id)
        linkedin_profile = await linkedin_service.get_profile(db, profile)
        with pytest.raises(InsufficientCreditError):
            await linkedin_review_service.request_review(db, linkedin_profile, profile)

    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one()
        profile = await get_or_create_profile(db, user.id)
        transactions = await credits_service.list_transactions(db, profile)
    assert transactions == []


async def test_review_requires_a_linkedin_url_first(client: TestClient) -> None:
    headers = candidate_client(client, "li.review.nourl@example.com")

    response = client.post("/api/v1/candidate/linkedin/review", headers=headers)

    assert response.status_code == 404


async def test_duplicate_active_review_is_rejected(client: TestClient) -> None:
    email = "li.review.duplicate@example.com"
    headers = candidate_client(client, email)
    client.put("/api/v1/candidate/linkedin", headers=headers, json={"profile_url": VALID_URL})
    await _grant_linkedin_review_credit(email, amount=2)
    client.post("/api/v1/candidate/linkedin/review", headers=headers)

    response = client.post("/api/v1/candidate/linkedin/review", headers=headers)

    assert response.status_code == 409
    balances = client.get("/api/v1/candidate/credits", headers=headers).json()
    linkedin_review_balance = next(
        b["balance"] for b in balances if b["credit_type"] == "LINKEDIN_REVIEW"
    )
    assert linkedin_review_balance == 1


async def test_get_review_before_any_request_returns_null(client: TestClient) -> None:
    headers = candidate_client(client, "li.review.none@example.com")
    client.put("/api/v1/candidate/linkedin", headers=headers, json={"profile_url": VALID_URL})

    response = client.get("/api/v1/candidate/linkedin/review", headers=headers)

    assert response.json() is None


async def test_no_result_before_completion(client: TestClient) -> None:
    email = "li.review.noresult@example.com"
    headers = candidate_client(client, email)
    client.put("/api/v1/candidate/linkedin", headers=headers, json={"profile_url": VALID_URL})
    await _grant_linkedin_review_credit(email)
    client.post("/api/v1/candidate/linkedin/review", headers=headers)

    response = client.get("/api/v1/candidate/linkedin/review", headers=headers)

    assert response.json()["result"] is None


async def test_completed_result_is_returned_with_all_fields(client: TestClient) -> None:
    email = "li.review.fullresult@example.com"
    headers = candidate_client(client, email)
    client.put("/api/v1/candidate/linkedin", headers=headers, json={"profile_url": VALID_URL})
    await _grant_linkedin_review_credit(email)
    created = client.post("/api/v1/candidate/linkedin/review", headers=headers).json()

    async with AsyncSessionLocal() as db:
        review_request = (
            await db.execute(
                select(LinkedInReviewRequest).where(LinkedInReviewRequest.id == created["id"])
            )
        ).scalar_one()
        await linkedin_review_service.complete_review(
            db,
            review_request,
            summary="Strong profile overall.",
            reviewer_type=ReviewerType.HUMAN,
            score=81,
            strengths=["Good headline"],
            improvements=["Add more detail to experience"],
            recommendations=["Request recommendations"],
        )

    body = client.get("/api/v1/candidate/linkedin/review", headers=headers).json()
    result = body["result"]

    assert body["status"] == "COMPLETED"
    assert result["score"] == 81
    assert result["summary"] == "Strong profile overall."
    assert result["strengths"] == ["Good headline"]
    assert result["improvements"] == ["Add more detail to experience"]
    assert result["recommendations"] == ["Request recommendations"]
    assert result["reviewer_type"] == "HUMAN"


async def test_cannot_edit_url_while_review_is_active(client: TestClient) -> None:
    email = "li.review.editblocked@example.com"
    headers = candidate_client(client, email)
    client.put("/api/v1/candidate/linkedin", headers=headers, json={"profile_url": VALID_URL})
    await _grant_linkedin_review_credit(email)
    client.post("/api/v1/candidate/linkedin/review", headers=headers)

    response = client.put(
        "/api/v1/candidate/linkedin",
        headers=headers,
        json={"profile_url": "https://linkedin.com/in/new-person"},
    )

    assert response.status_code == 409


async def test_url_review_consistency_old_review_keeps_old_snapshot(
    client: TestClient,
) -> None:
    """URL A -> review requested -> URL updated to B. The completed
    review for A must never appear to be about B."""
    email = "li.review.consistency@example.com"
    headers = candidate_client(client, email)
    client.put("/api/v1/candidate/linkedin", headers=headers, json={"profile_url": VALID_URL})
    await _grant_linkedin_review_credit(email, amount=2)
    created = client.post("/api/v1/candidate/linkedin/review", headers=headers).json()

    async with AsyncSessionLocal() as db:
        review_request = (
            await db.execute(
                select(LinkedInReviewRequest).where(LinkedInReviewRequest.id == created["id"])
            )
        ).scalar_one()
        await linkedin_review_service.complete_review(
            db, review_request, summary="Done.", reviewer_type=ReviewerType.HUMAN
        )

    new_url = "https://linkedin.com/in/new-person"
    update_response = client.put(
        "/api/v1/candidate/linkedin", headers=headers, json={"profile_url": new_url}
    )
    assert update_response.status_code == 200

    old_review = client.get("/api/v1/candidate/linkedin/review", headers=headers).json()
    assert old_review["profile_url_snapshot"] == VALID_URL
    assert old_review["profile_url_snapshot"] != new_url

    new_review = client.post("/api/v1/candidate/linkedin/review", headers=headers).json()
    assert new_review["profile_url_snapshot"] == new_url


async def test_concurrent_review_requests_never_create_two_active_reviews(
    client: TestClient,
) -> None:
    """Mirrors Phase 5's concurrency test: two separate DB sessions
    request a review for the same LinkedIn profile at the same time via
    asyncio.gather, genuinely overlapping at the database."""
    email = "li.review.concurrent@example.com"
    register_and_login(client, email)

    async with AsyncSessionLocal() as setup_db:
        user = (await setup_db.execute(select(User).where(User.email == email))).scalar_one()
        profile = await get_or_create_profile(setup_db, user.id)
        await linkedin_service.upsert_profile(setup_db, profile, VALID_URL)
    await _grant_linkedin_review_credit(email, amount=2)

    async def do_request() -> str | None:
        async with AsyncSessionLocal() as db:
            user = (await db.execute(select(User).where(User.email == email))).scalar_one()
            profile = await get_or_create_profile(db, user.id)
            linkedin_profile = await linkedin_service.get_profile(db, profile)
            try:
                await linkedin_review_service.request_review(db, linkedin_profile, profile)
                return "ok"
            except linkedin_review_service.DuplicateActiveReviewError:
                return "duplicate"

    outcomes = await asyncio.gather(do_request(), do_request())

    assert sorted(outcomes) == ["duplicate", "ok"]


async def test_two_concurrent_review_requests_with_one_credit_only_one_succeeds(
    client: TestClient,
) -> None:
    """Candidate has exactly 1 LINKEDIN_REVIEW credit; two concurrent
    review requests for two different candidates' profiles can't both
    be satisfied from one candidate's wallet. Uses two different
    candidates' profiles updated to simulate two genuinely-concurrent
    request attempts racing on the same candidate's own ledger (mirrors
    the Phase 7 mock-interview credit-race test) by requesting on the
    same profile from two overlapping sessions while only the
    duplicate-review guard or the credit guard can be the reason either
    one loses -- asserted generically as "exactly one succeeds"."""
    email = "li.review.credit-race@example.com"
    register_and_login(client, email)

    async with AsyncSessionLocal() as setup_db:
        user = (await setup_db.execute(select(User).where(User.email == email))).scalar_one()
        profile = await get_or_create_profile(setup_db, user.id)
        await linkedin_service.upsert_profile(setup_db, profile, VALID_URL)
    await _grant_linkedin_review_credit(email, amount=1)

    async def do_request() -> str:
        async with AsyncSessionLocal() as db:
            user = (await db.execute(select(User).where(User.email == email))).scalar_one()
            profile = await get_or_create_profile(db, user.id)
            linkedin_profile = await linkedin_service.get_profile(db, profile)
            try:
                await linkedin_review_service.request_review(db, linkedin_profile, profile)
                return "ok"
            except (linkedin_review_service.DuplicateActiveReviewError, InsufficientCreditError):
                return "rejected"

    outcomes = await asyncio.gather(do_request(), do_request())

    assert sorted(outcomes) == ["ok", "rejected"]

    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one()
        profile = await get_or_create_profile(db, user.id)
        balance = await credits_service.get_balance(db, profile, CreditType.LINKEDIN_REVIEW)
    assert balance == 0
