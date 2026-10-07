import asyncio

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.credits import CreditTransactionReason, CreditType, InsufficientCreditError
from app.core.review import ReviewerType
from app.db.session import AsyncSessionLocal
from app.models.resume import Resume
from app.models.review_request import ReviewRequest
from app.models.user import User
from app.services import credits as credits_service
from app.services import resume_review as review_service
from app.services.candidate_profile import get_or_create_profile
from tests.helpers import VALID_PDF_BYTES, candidate_client, upload_resume


def _upload_one(client: TestClient, headers: dict) -> str:
    response = upload_resume(client, headers, "resume.pdf", VALID_PDF_BYTES, "application/pdf")
    return response.json()["id"]


async def _grant_resume_review_credit(email: str, amount: int = 1) -> None:
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one()
        profile = await get_or_create_profile(db, user.id)
        await credits_service.grant_credit(
            db, profile, CreditType.RESUME_REVIEW, amount, CreditTransactionReason.PROMOTIONAL_GRANT
        )


async def _load_review_request(db: AsyncSession, review_request_id: str) -> ReviewRequest:
    """Loads via the *given* session, not a throwaway one of its own:
    the object must stay attached to whichever session later calls
    start_review()/complete_review() on it, or SQLAlchemy treats it as
    detached and silently drops the mutations on commit."""
    result = await db.execute(select(ReviewRequest).where(ReviewRequest.id == review_request_id))
    return result.scalar_one()


async def test_request_review_succeeds(client: TestClient) -> None:
    email = "review.request@example.com"
    headers = candidate_client(client, email)
    resume_id = _upload_one(client, headers)
    await _grant_resume_review_credit(email)

    response = client.post(f"/api/v1/candidate/resumes/{resume_id}/review", headers=headers)

    assert response.status_code == 201
    body = response.json()
    assert body["resume_id"] == resume_id
    assert body["status"] == "REQUESTED"
    assert body["result"] is None


async def test_review_request_deducts_one_resume_review_credit(client: TestClient) -> None:
    email = "review.deducts@example.com"
    headers = candidate_client(client, email)
    resume_id = _upload_one(client, headers)
    await _grant_resume_review_credit(email)

    client.post(f"/api/v1/candidate/resumes/{resume_id}/review", headers=headers)

    balances = client.get("/api/v1/candidate/credits", headers=headers).json()
    resume_review_balance = next(
        b["balance"] for b in balances if b["credit_type"] == "RESUME_REVIEW"
    )
    assert resume_review_balance == 0


async def test_review_request_without_credit_is_rejected(client: TestClient) -> None:
    email = "review.nocredit@example.com"
    headers = candidate_client(client, email)
    resume_id = _upload_one(client, headers)

    response = client.post(f"/api/v1/candidate/resumes/{resume_id}/review", headers=headers)

    assert response.status_code == 409

    # No review request was created, and no credit was ever recorded.
    get_response = client.get(f"/api/v1/candidate/resumes/{resume_id}/review", headers=headers)
    assert get_response.json() is None
    balances = client.get("/api/v1/candidate/credits", headers=headers).json()
    resume_review_balance = next(
        b["balance"] for b in balances if b["credit_type"] == "RESUME_REVIEW"
    )
    assert resume_review_balance == 0


async def test_insufficient_credit_leaves_no_review_request_and_no_lost_credit(
    client: TestClient,
) -> None:
    email = "review.insufficient@example.com"
    headers = candidate_client(client, email)
    resume_id = _upload_one(client, headers)

    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one()
        profile = await get_or_create_profile(db, user.id)
        resume = (
            await db.execute(select(Resume).where(Resume.id == resume_id))
        ).scalar_one()
        with pytest.raises(InsufficientCreditError):
            await review_service.request_review(db, resume, profile)

    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one()
        profile = await get_or_create_profile(db, user.id)
        transactions = await credits_service.list_transactions(db, profile)
    assert transactions == []


async def test_requesting_review_marks_resume_under_review(client: TestClient) -> None:
    email = "review.marksresume@example.com"
    headers = candidate_client(client, email)
    resume_id = _upload_one(client, headers)
    await _grant_resume_review_credit(email)

    client.post(f"/api/v1/candidate/resumes/{resume_id}/review", headers=headers)
    resume = client.get(f"/api/v1/candidate/resumes/{resume_id}", headers=headers).json()

    assert resume["status"] == "UNDER_REVIEW"


async def test_duplicate_active_review_is_rejected(client: TestClient) -> None:
    email = "review.duplicate@example.com"
    headers = candidate_client(client, email)
    resume_id = _upload_one(client, headers)
    await _grant_resume_review_credit(email, amount=2)
    client.post(f"/api/v1/candidate/resumes/{resume_id}/review", headers=headers)

    response = client.post(f"/api/v1/candidate/resumes/{resume_id}/review", headers=headers)

    assert response.status_code == 409
    # The rejected duplicate attempt never consumed a second credit.
    balances = client.get("/api/v1/candidate/credits", headers=headers).json()
    resume_review_balance = next(
        b["balance"] for b in balances if b["credit_type"] == "RESUME_REVIEW"
    )
    assert resume_review_balance == 1


def test_get_review_before_any_request_returns_null(client: TestClient) -> None:
    headers = candidate_client(client, "review.none@example.com")
    resume_id = _upload_one(client, headers)

    response = client.get(f"/api/v1/candidate/resumes/{resume_id}/review", headers=headers)

    assert response.status_code == 200
    assert response.json() is None


async def test_review_has_no_result_before_completion(client: TestClient) -> None:
    email = "review.noresultyet@example.com"
    headers = candidate_client(client, email)
    resume_id = _upload_one(client, headers)
    await _grant_resume_review_credit(email)
    client.post(f"/api/v1/candidate/resumes/{resume_id}/review", headers=headers)

    response = client.get(f"/api/v1/candidate/resumes/{resume_id}/review", headers=headers)

    assert response.json()["result"] is None


async def test_review_status_transitions_correctly_through_service_layer(
    client: TestClient,
) -> None:
    """IN_REVIEW/COMPLETED have no candidate-facing endpoint in this
    phase (no reviewer portal yet) -- verified directly against the
    service functions a future reviewer tool will call."""
    email = "review.transitions@example.com"
    headers = candidate_client(client, email)
    resume_id = _upload_one(client, headers)
    await _grant_resume_review_credit(email)
    created = client.post(
        f"/api/v1/candidate/resumes/{resume_id}/review", headers=headers
    ).json()

    async with AsyncSessionLocal() as db:
        review_request = await _load_review_request(db, created["id"])
        updated = await review_service.start_review(db, review_request)
        assert updated.status == "IN_REVIEW"
        assert updated.started_at is not None

        await review_service.complete_review(
            db,
            updated,
            summary="Good resume.",
            reviewer_type=ReviewerType.HUMAN,
            score=75,
        )

    response = client.get(f"/api/v1/candidate/resumes/{resume_id}/review", headers=headers)
    body = response.json()
    assert body["status"] == "COMPLETED"
    assert body["completed_at"] is not None


async def test_completed_result_is_returned_with_all_fields(client: TestClient) -> None:
    email = "review.fullresult@example.com"
    headers = candidate_client(client, email)
    resume_id = _upload_one(client, headers)
    await _grant_resume_review_credit(email)
    created = client.post(
        f"/api/v1/candidate/resumes/{resume_id}/review", headers=headers
    ).json()

    async with AsyncSessionLocal() as db:
        review_request = await _load_review_request(db, created["id"])
        await review_service.complete_review(
            db,
            review_request,
            summary="Strong candidate overall.",
            reviewer_type=ReviewerType.HUMAN,
            score=88,
            strengths=["Clear layout", "Relevant experience"],
            improvements=["Shorten bullet points"],
            recommendations=["Add a projects section"],
        )

    body = client.get(f"/api/v1/candidate/resumes/{resume_id}/review", headers=headers).json()
    result = body["result"]

    assert result["score"] == 88
    assert result["summary"] == "Strong candidate overall."
    assert result["strengths"] == ["Clear layout", "Relevant experience"]
    assert result["improvements"] == ["Shorten bullet points"]
    assert result["recommendations"] == ["Add a projects section"]
    assert result["reviewer_type"] == "HUMAN"


async def test_resume_becomes_completed_after_review_completes(client: TestClient) -> None:
    email = "review.resumecompleted@example.com"
    headers = candidate_client(client, email)
    resume_id = _upload_one(client, headers)
    await _grant_resume_review_credit(email)
    created = client.post(
        f"/api/v1/candidate/resumes/{resume_id}/review", headers=headers
    ).json()

    async with AsyncSessionLocal() as db:
        review_request = await _load_review_request(db, created["id"])
        await review_service.complete_review(
            db, review_request, summary="Done.", reviewer_type=ReviewerType.HUMAN
        )

    resume = client.get(f"/api/v1/candidate/resumes/{resume_id}", headers=headers).json()
    assert resume["status"] == "COMPLETED"


async def test_requesting_review_again_after_completion_is_allowed(client: TestClient) -> None:
    """Only an *active* review blocks a new request -- a completed one
    for a previous cycle should not."""
    email = "review.afterCompletion@example.com"
    headers = candidate_client(client, email)
    resume_id = _upload_one(client, headers)
    await _grant_resume_review_credit(email, amount=2)
    created = client.post(
        f"/api/v1/candidate/resumes/{resume_id}/review", headers=headers
    ).json()

    async with AsyncSessionLocal() as db:
        review_request = await _load_review_request(db, created["id"])
        await review_service.complete_review(
            db, review_request, summary="Done.", reviewer_type=ReviewerType.HUMAN
        )

    response = client.post(f"/api/v1/candidate/resumes/{resume_id}/review", headers=headers)

    assert response.status_code == 201


async def test_two_concurrent_review_requests_with_one_credit_only_one_succeeds(
    client: TestClient,
) -> None:
    """Candidate has exactly 1 RESUME_REVIEW credit and two different
    resumes (so the one-active-review-per-resume guard can't be what
    blocks the second request); two concurrent review requests arrive
    via asyncio.gather, genuinely overlapping at the database (mirrors
    the Phase 7 mock-interview credit-race test)."""
    email = "review.credit-race@example.com"
    headers = candidate_client(client, email)
    resume_id_1 = _upload_one(client, headers)
    resume_id_2 = _upload_one(client, headers)
    await _grant_resume_review_credit(email, amount=1)

    async def do_request(resume_id: str) -> str:
        async with AsyncSessionLocal() as db:
            user = (await db.execute(select(User).where(User.email == email))).scalar_one()
            profile = await get_or_create_profile(db, user.id)
            resume = (
                await db.execute(select(Resume).where(Resume.id == resume_id))
            ).scalar_one()
            try:
                await review_service.request_review(db, resume, profile)
                return "ok"
            except InsufficientCreditError:
                return "insufficient"

    outcomes = await asyncio.gather(do_request(resume_id_1), do_request(resume_id_2))

    assert sorted(outcomes) == ["insufficient", "ok"]

    async with AsyncSessionLocal() as db:
        rows = (
            await db.execute(
                select(ReviewRequest).where(ReviewRequest.resume_id.in_([resume_id_1, resume_id_2]))
            )
        ).scalars().all()
    assert len(rows) == 1

    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one()
        profile = await get_or_create_profile(db, user.id)
        balance = await credits_service.get_balance(db, profile, CreditType.RESUME_REVIEW)
    assert balance == 0
