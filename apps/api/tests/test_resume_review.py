from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.review import ReviewerType
from app.db.session import AsyncSessionLocal
from app.models.review_request import ReviewRequest
from app.services import resume_review as review_service
from tests.helpers import VALID_PDF_BYTES, candidate_client, upload_resume


def _upload_one(client: TestClient, headers: dict) -> str:
    response = upload_resume(client, headers, "resume.pdf", VALID_PDF_BYTES, "application/pdf")
    return response.json()["id"]


async def _load_review_request(db: AsyncSession, review_request_id: str) -> ReviewRequest:
    """Loads via the *given* session, not a throwaway one of its own:
    the object must stay attached to whichever session later calls
    start_review()/complete_review() on it, or SQLAlchemy treats it as
    detached and silently drops the mutations on commit."""
    result = await db.execute(select(ReviewRequest).where(ReviewRequest.id == review_request_id))
    return result.scalar_one()


def test_request_review_succeeds(client: TestClient) -> None:
    headers = candidate_client(client, "review.request@example.com")
    resume_id = _upload_one(client, headers)

    response = client.post(f"/api/v1/candidate/resumes/{resume_id}/review", headers=headers)

    assert response.status_code == 201
    body = response.json()
    assert body["resume_id"] == resume_id
    assert body["status"] == "REQUESTED"
    assert body["result"] is None


def test_requesting_review_marks_resume_under_review(client: TestClient) -> None:
    headers = candidate_client(client, "review.marksresume@example.com")
    resume_id = _upload_one(client, headers)

    client.post(f"/api/v1/candidate/resumes/{resume_id}/review", headers=headers)
    resume = client.get(f"/api/v1/candidate/resumes/{resume_id}", headers=headers).json()

    assert resume["status"] == "UNDER_REVIEW"


def test_duplicate_active_review_is_rejected(client: TestClient) -> None:
    headers = candidate_client(client, "review.duplicate@example.com")
    resume_id = _upload_one(client, headers)
    client.post(f"/api/v1/candidate/resumes/{resume_id}/review", headers=headers)

    response = client.post(f"/api/v1/candidate/resumes/{resume_id}/review", headers=headers)

    assert response.status_code == 409


def test_get_review_before_any_request_returns_null(client: TestClient) -> None:
    headers = candidate_client(client, "review.none@example.com")
    resume_id = _upload_one(client, headers)

    response = client.get(f"/api/v1/candidate/resumes/{resume_id}/review", headers=headers)

    assert response.status_code == 200
    assert response.json() is None


def test_review_has_no_result_before_completion(client: TestClient) -> None:
    headers = candidate_client(client, "review.noresultyet@example.com")
    resume_id = _upload_one(client, headers)
    client.post(f"/api/v1/candidate/resumes/{resume_id}/review", headers=headers)

    response = client.get(f"/api/v1/candidate/resumes/{resume_id}/review", headers=headers)

    assert response.json()["result"] is None


async def test_review_status_transitions_correctly_through_service_layer(
    client: TestClient,
) -> None:
    """IN_REVIEW/COMPLETED have no candidate-facing endpoint in this
    phase (no reviewer portal yet) -- verified directly against the
    service functions a future reviewer tool will call."""
    headers = candidate_client(client, "review.transitions@example.com")
    resume_id = _upload_one(client, headers)
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
    headers = candidate_client(client, "review.fullresult@example.com")
    resume_id = _upload_one(client, headers)
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
    headers = candidate_client(client, "review.resumecompleted@example.com")
    resume_id = _upload_one(client, headers)
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
    headers = candidate_client(client, "review.afterCompletion@example.com")
    resume_id = _upload_one(client, headers)
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
