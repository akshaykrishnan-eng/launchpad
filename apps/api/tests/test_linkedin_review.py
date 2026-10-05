import asyncio

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.review import ReviewerType
from app.db.session import AsyncSessionLocal
from app.models.linkedin_review_request import LinkedInReviewRequest
from app.models.user import User
from app.services import linkedin as linkedin_service
from app.services import linkedin_review as linkedin_review_service
from app.services.candidate_profile import get_or_create_profile
from tests.helpers import candidate_client, register_and_login

VALID_URL = "https://linkedin.com/in/review-person"


def test_request_review_succeeds(client: TestClient) -> None:
    headers = candidate_client(client, "li.review.request@example.com")
    client.put("/api/v1/candidate/linkedin", headers=headers, json={"profile_url": VALID_URL})

    response = client.post("/api/v1/candidate/linkedin/review", headers=headers)

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "REQUESTED"
    assert body["profile_url_snapshot"] == VALID_URL
    assert body["result"] is None


def test_review_requires_a_linkedin_url_first(client: TestClient) -> None:
    headers = candidate_client(client, "li.review.nourl@example.com")

    response = client.post("/api/v1/candidate/linkedin/review", headers=headers)

    assert response.status_code == 404


def test_duplicate_active_review_is_rejected(client: TestClient) -> None:
    headers = candidate_client(client, "li.review.duplicate@example.com")
    client.put("/api/v1/candidate/linkedin", headers=headers, json={"profile_url": VALID_URL})
    client.post("/api/v1/candidate/linkedin/review", headers=headers)

    response = client.post("/api/v1/candidate/linkedin/review", headers=headers)

    assert response.status_code == 409


def test_get_review_before_any_request_returns_null(client: TestClient) -> None:
    headers = candidate_client(client, "li.review.none@example.com")
    client.put("/api/v1/candidate/linkedin", headers=headers, json={"profile_url": VALID_URL})

    response = client.get("/api/v1/candidate/linkedin/review", headers=headers)

    assert response.json() is None


def test_no_result_before_completion(client: TestClient) -> None:
    headers = candidate_client(client, "li.review.noresult@example.com")
    client.put("/api/v1/candidate/linkedin", headers=headers, json={"profile_url": VALID_URL})
    client.post("/api/v1/candidate/linkedin/review", headers=headers)

    response = client.get("/api/v1/candidate/linkedin/review", headers=headers)

    assert response.json()["result"] is None


async def test_completed_result_is_returned_with_all_fields(client: TestClient) -> None:
    headers = candidate_client(client, "li.review.fullresult@example.com")
    client.put("/api/v1/candidate/linkedin", headers=headers, json={"profile_url": VALID_URL})
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
    headers = candidate_client(client, "li.review.editblocked@example.com")
    client.put("/api/v1/candidate/linkedin", headers=headers, json={"profile_url": VALID_URL})
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
    headers = candidate_client(client, "li.review.consistency@example.com")
    client.put("/api/v1/candidate/linkedin", headers=headers, json={"profile_url": VALID_URL})
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

    async def do_request() -> str | None:
        async with AsyncSessionLocal() as db:
            user = (await db.execute(select(User).where(User.email == email))).scalar_one()
            profile = await get_or_create_profile(db, user.id)
            linkedin_profile = await linkedin_service.get_profile(db, profile)
            try:
                await linkedin_review_service.request_review(db, linkedin_profile)
                return "ok"
            except linkedin_review_service.DuplicateActiveReviewError:
                return "duplicate"

    outcomes = await asyncio.gather(do_request(), do_request())

    assert sorted(outcomes) == ["duplicate", "ok"]
