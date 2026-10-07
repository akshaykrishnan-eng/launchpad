from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.credits import CreditTransactionReason, CreditType
from app.core.mock_interview import InterviewType
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.services import credits as credits_service
from app.services import mock_interview as mock_interview_service
from app.services.candidate_profile import get_or_create_profile
from tests.helpers import (
    VALID_PDF_BYTES,
    candidate_client,
    role_client,
    upload_resume,
)

LINKEDIN_URL = "https://linkedin.com/in/review-person"


def _future(hours: int = 24):
    return datetime.now(UTC) + timedelta(hours=hours)


async def _profile_for(email: str):
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one()
        return await get_or_create_profile(db, user.id)


async def _grant(email: str, credit_type: CreditType, amount: int = 1) -> None:
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one()
        profile = await get_or_create_profile(db, user.id)
        await credits_service.grant_credit(
            db, profile, credit_type, amount, CreditTransactionReason.PROMOTIONAL_GRANT
        )


# --- Authorization matrix ---------------------------------------------


def test_unauthenticated_request_is_rejected(client: TestClient) -> None:
    assert client.get("/api/v1/admin/dashboard").status_code == 401


async def test_candidate_cannot_access_admin_api(client: TestClient) -> None:
    headers = candidate_client(client, "admin.denied.candidate@example.com")
    assert client.get("/api/v1/admin/dashboard", headers=headers).status_code == 403


async def test_interviewer_cannot_access_admin_api(client: TestClient) -> None:
    headers = await role_client(client, "admin.denied.interviewer@example.com", "INTERVIEWER")
    assert client.get("/api/v1/admin/dashboard", headers=headers).status_code == 403


async def test_career_coach_cannot_access_admin_api(client: TestClient) -> None:
    headers = await role_client(client, "admin.denied.coach@example.com", "CAREER_COACH")
    assert client.get("/api/v1/admin/dashboard", headers=headers).status_code == 403


async def test_recruiter_cannot_access_admin_api(client: TestClient) -> None:
    headers = await role_client(client, "admin.denied.recruiter@example.com", "RECRUITER")
    assert client.get("/api/v1/admin/dashboard", headers=headers).status_code == 403


async def test_admin_can_access_admin_api(client: TestClient) -> None:
    headers = await role_client(client, "admin.allowed.admin@example.com", "ADMIN")
    assert client.get("/api/v1/admin/dashboard", headers=headers).status_code == 200


async def test_super_admin_can_access_admin_api(client: TestClient) -> None:
    headers = await role_client(client, "admin.allowed.superadmin@example.com", "SUPER_ADMIN")
    assert client.get("/api/v1/admin/dashboard", headers=headers).status_code == 200


# --- Dashboard ----------------------------------------------------------


async def test_dashboard_metrics_are_real_counts(client: TestClient) -> None:
    admin_headers = await role_client(client, "dashboard.admin@example.com", "ADMIN")
    candidate_client(client, "dashboard.candidate@example.com")
    await _profile_for("dashboard.candidate@example.com")

    response = client.get("/api/v1/admin/dashboard", headers=admin_headers)
    body = response.json()

    assert response.status_code == 200
    assert body["metrics"]["total_candidates"] >= 1
    assert "recent_candidates" in body
    assert any(c["email"] == "dashboard.candidate@example.com" for c in body["recent_candidates"])


# --- Candidates --------------------------------------------------------


async def test_candidate_list_is_paginated(client: TestClient) -> None:
    admin_headers = await role_client(client, "list.admin@example.com", "ADMIN")
    for i in range(3):
        email = f"list.candidate{i}@example.com"
        candidate_client(client, email)
        # A CandidateProfile row is only created lazily, on first access
        # to a /candidate/* endpoint -- force it so these candidates are
        # actually visible to the admin list below.
        await _profile_for(email)

    response = client.get(
        "/api/v1/admin/candidates", params={"page": 1, "page_size": 2}, headers=admin_headers
    )
    body = response.json()

    assert response.status_code == 200
    assert len(body["items"]) == 2
    assert body["page"] == 1
    assert body["page_size"] == 2
    # 3 candidates registered above, plus possibly others from earlier tests.
    assert body["total"] >= 3


async def test_candidate_search_matches_email(client: TestClient) -> None:
    admin_headers = await role_client(client, "search.admin@example.com", "ADMIN")
    candidate_client(client, "findme.unique@example.com")
    await _profile_for("findme.unique@example.com")
    candidate_client(client, "someoneelse.unique@example.com")
    await _profile_for("someoneelse.unique@example.com")

    response = client.get(
        "/api/v1/admin/candidates", params={"search": "findme.unique"}, headers=admin_headers
    )
    body = response.json()

    assert response.status_code == 200
    assert len(body["items"]) == 1
    assert body["items"][0]["email"] == "findme.unique@example.com"


async def test_candidate_list_rejects_oversized_page_size(client: TestClient) -> None:
    admin_headers = await role_client(client, "oversize.admin@example.com", "ADMIN")

    response = client.get(
        "/api/v1/admin/candidates", params={"page_size": 10000}, headers=admin_headers
    )

    assert response.status_code == 422


# --- Candidate 360 -------------------------------------------------------


async def test_candidate_360_returns_404_for_nonexistent_candidate(client: TestClient) -> None:
    admin_headers = await role_client(client, "c360.admin@example.com", "ADMIN")
    fake_id = "00000000-0000-0000-0000-000000000000"

    response = client.get(f"/api/v1/admin/candidates/{fake_id}", headers=admin_headers)

    assert response.status_code == 404


async def test_candidate_360_shows_profile_resume_linkedin_interviews_credits(
    client: TestClient,
) -> None:
    admin_headers = await role_client(client, "c360.admin2@example.com", "ADMIN")
    email = "c360.rich@example.com"
    candidate_headers = candidate_client(client, email)

    client.patch(
        "/api/v1/candidate/profile",
        headers=candidate_headers,
        json={"first_name": "Rich", "last_name": "Candidate"},
    )
    upload_resume(client, candidate_headers, "resume.pdf", VALID_PDF_BYTES, "application/pdf")
    client.put(
        "/api/v1/candidate/linkedin", headers=candidate_headers, json={"profile_url": LINKEDIN_URL}
    )

    profile = await _profile_for(email)
    async with AsyncSessionLocal() as db:
        profile = await get_or_create_profile(db, profile.user_id)
        await credits_service.grant_credit(
            db, profile, CreditType.MOCK_INTERVIEW, 1, CreditTransactionReason.PROMOTIONAL_GRANT
        )
        slot = await mock_interview_service.create_slot(
            db, InterviewType.HR, _future(), _future(hours=25)
        )
    client.post(
        "/api/v1/candidate/mock-interviews/book",
        headers=candidate_headers,
        json={"slot_id": str(slot.id)},
    )

    response = client.get(f"/api/v1/admin/candidates/{profile.id}", headers=admin_headers)
    body = response.json()

    assert response.status_code == 200
    assert body["candidate"]["email"] == email
    assert body["profile"]["first_name"] == "Rich"
    assert body["resume"]["original_filename"] == "resume.pdf"
    assert body["linkedin"]["profile_url"] == LINKEDIN_URL
    assert len(body["interviews"]) == 1
    assert body["interviews"][0]["interview_type"] == "HR"
    credit_balances = {c["credit_type"]: c["balance"] for c in body["credits"]}
    assert credit_balances["MOCK_INTERVIEW"] == 0  # 1 granted, 1 spent booking


async def test_candidate_360_never_exposes_auth_secrets(client: TestClient) -> None:
    admin_headers = await role_client(client, "c360.secrets.admin@example.com", "ADMIN")
    email = "c360.secrets.candidate@example.com"
    candidate_client(client, email)
    profile = await _profile_for(email)

    response = client.get(f"/api/v1/admin/candidates/{profile.id}", headers=admin_headers)
    raw_body = response.text.lower()

    assert response.status_code == 200
    assert "password" not in raw_body
    assert "refresh_token" not in raw_body
    assert "token_hash" not in raw_body


# --- Resume review workflow ---------------------------------------------


async def test_resume_review_queue_and_completion(client: TestClient) -> None:
    admin_headers = await role_client(client, "resumereview.admin@example.com", "ADMIN")
    email = "resumereview.candidate@example.com"
    candidate_headers = candidate_client(client, email)
    await _grant(email, CreditType.RESUME_REVIEW)
    upload_resume(client, candidate_headers, "resume.pdf", VALID_PDF_BYTES, "application/pdf")
    resume_id = client.get("/api/v1/candidate/resumes", headers=candidate_headers).json()[0]["id"]
    client.post(f"/api/v1/candidate/resumes/{resume_id}/review", headers=candidate_headers)

    queue = client.get(
        "/api/v1/admin/resume-reviews", params={"status": "REQUESTED"}, headers=admin_headers
    )
    assert queue.status_code == 200
    matching = [item for item in queue.json()["items"] if item["candidate"]["email"] == email]
    assert len(matching) == 1
    review_id = matching[0]["review"]["id"]

    detail = client.get(f"/api/v1/admin/resume-reviews/{review_id}", headers=admin_headers)
    assert detail.status_code == 200
    assert detail.json()["resume_filename"] == "resume.pdf"

    started = client.post(f"/api/v1/admin/resume-reviews/{review_id}/start", headers=admin_headers)
    assert started.status_code == 200
    assert started.json()["status"] == "IN_REVIEW"

    completed = client.post(
        f"/api/v1/admin/resume-reviews/{review_id}/complete",
        headers=admin_headers,
        json={
            "score": 85,
            "summary": "Solid resume overall.",
            "strengths": ["Clear formatting"],
            "improvements": ["Add a summary section"],
            "recommendations": ["Tailor keywords to the role"],
        },
    )
    assert completed.status_code == 200
    assert completed.json()["status"] == "COMPLETED"

    # The candidate sees it too -- same read path as Phase 5.
    candidate_view = client.get(
        f"/api/v1/candidate/resumes/{resume_id}/review", headers=candidate_headers
    )
    assert candidate_view.json()["result"]["score"] == 85


async def test_resume_review_cannot_be_completed_twice(client: TestClient) -> None:
    admin_headers = await role_client(client, "resumereview.twice.admin@example.com", "ADMIN")
    email = "resumereview.twice.candidate@example.com"
    candidate_headers = candidate_client(client, email)
    await _grant(email, CreditType.RESUME_REVIEW)
    upload_resume(client, candidate_headers, "resume.pdf", VALID_PDF_BYTES, "application/pdf")
    resume_id = client.get("/api/v1/candidate/resumes", headers=candidate_headers).json()[0]["id"]
    review_id = client.post(
        f"/api/v1/candidate/resumes/{resume_id}/review", headers=candidate_headers
    ).json()["id"]

    client.post(
        f"/api/v1/admin/resume-reviews/{review_id}/complete",
        headers=admin_headers,
        json={"score": 70, "summary": "Fine."},
    )
    second_attempt = client.post(
        f"/api/v1/admin/resume-reviews/{review_id}/complete",
        headers=admin_headers,
        json={"score": 70, "summary": "Fine again."},
    )

    assert second_attempt.status_code == 409


async def test_resume_review_completion_validates_score_range(client: TestClient) -> None:
    admin_headers = await role_client(client, "resumereview.badscore.admin@example.com", "ADMIN")
    email = "resumereview.badscore.candidate@example.com"
    candidate_headers = candidate_client(client, email)
    await _grant(email, CreditType.RESUME_REVIEW)
    upload_resume(client, candidate_headers, "resume.pdf", VALID_PDF_BYTES, "application/pdf")
    resume_id = client.get("/api/v1/candidate/resumes", headers=candidate_headers).json()[0]["id"]
    review_id = client.post(
        f"/api/v1/candidate/resumes/{resume_id}/review", headers=candidate_headers
    ).json()["id"]

    response = client.post(
        f"/api/v1/admin/resume-reviews/{review_id}/complete",
        headers=admin_headers,
        json={"score": 150, "summary": "Out of range."},
    )

    assert response.status_code == 422


# --- LinkedIn review workflow ---------------------------------------------


async def test_linkedin_review_queue_and_completion(client: TestClient) -> None:
    admin_headers = await role_client(client, "lireview.admin@example.com", "ADMIN")
    email = "lireview.candidate@example.com"
    candidate_headers = candidate_client(client, email)
    await _grant(email, CreditType.LINKEDIN_REVIEW)
    client.put(
        "/api/v1/candidate/linkedin", headers=candidate_headers, json={"profile_url": LINKEDIN_URL}
    )
    client.post("/api/v1/candidate/linkedin/review", headers=candidate_headers)

    queue = client.get(
        "/api/v1/admin/linkedin-reviews", params={"status": "REQUESTED"}, headers=admin_headers
    )
    matching = [item for item in queue.json()["items"] if item["candidate"]["email"] == email]
    assert len(matching) == 1
    review_id = matching[0]["review"]["id"]

    client.post(f"/api/v1/admin/linkedin-reviews/{review_id}/start", headers=admin_headers)
    completed = client.post(
        f"/api/v1/admin/linkedin-reviews/{review_id}/complete",
        headers=admin_headers,
        json={"score": 78, "summary": "Good headline, needs a summary."},
    )

    assert completed.status_code == 200
    assert completed.json()["status"] == "COMPLETED"

    candidate_view = client.get("/api/v1/candidate/linkedin/review", headers=candidate_headers)
    assert candidate_view.json()["result"]["score"] == 78


# --- Mock interview operations --------------------------------------------


async def test_admin_can_create_slot_and_see_it_booked(client: TestClient) -> None:
    admin_headers = await role_client(client, "slots.admin@example.com", "ADMIN")
    candidate_headers = candidate_client(client, "slots.candidate@example.com")
    email = "slots.candidate@example.com"
    profile = await _profile_for(email)
    async with AsyncSessionLocal() as db:
        profile = await get_or_create_profile(db, profile.user_id)
        await credits_service.grant_credit(
            db, profile, CreditType.MOCK_INTERVIEW, 1, CreditTransactionReason.PROMOTIONAL_GRANT
        )

    create_response = client.post(
        "/api/v1/admin/mock-interviews/slots",
        headers=admin_headers,
        json={
            "interview_type": "HR",
            "starts_at": _future().isoformat(),
            "ends_at": _future(hours=25).isoformat(),
        },
    )
    assert create_response.status_code == 201
    slot = create_response.json()
    assert slot["status"] == "OPEN"

    client.post(
        "/api/v1/candidate/mock-interviews/book",
        headers=candidate_headers,
        json={"slot_id": slot["id"]},
    )

    slots_list = client.get("/api/v1/admin/mock-interviews/slots", headers=admin_headers).json()
    booked = next(s for s in slots_list["items"] if s["id"] == slot["id"])
    assert booked["status"] == "BOOKED"

    interviews = client.get("/api/v1/admin/mock-interviews", headers=admin_headers).json()
    matching = [item for item in interviews["items"] if item["candidate"]["email"] == email]
    assert len(matching) == 1


async def test_create_slot_rejects_end_before_start(client: TestClient) -> None:
    admin_headers = await role_client(client, "slots.invalid.admin@example.com", "ADMIN")

    response = client.post(
        "/api/v1/admin/mock-interviews/slots",
        headers=admin_headers,
        json={
            "interview_type": "HR",
            "starts_at": _future(hours=2).isoformat(),
            "ends_at": _future(hours=1).isoformat(),
        },
    )

    assert response.status_code == 422


async def test_admin_can_complete_interview_with_feedback(client: TestClient) -> None:
    admin_headers = await role_client(client, "complete.admin@example.com", "ADMIN")
    email = "complete.candidate@example.com"
    candidate_headers = candidate_client(client, email)
    profile = await _profile_for(email)
    async with AsyncSessionLocal() as db:
        profile = await get_or_create_profile(db, profile.user_id)
        await credits_service.grant_credit(
            db, profile, CreditType.MOCK_INTERVIEW, 1, CreditTransactionReason.PROMOTIONAL_GRANT
        )
        slot = await mock_interview_service.create_slot(
            db, InterviewType.HR, _future(), _future(hours=25)
        )
    booked = client.post(
        "/api/v1/candidate/mock-interviews/book",
        headers=candidate_headers,
        json={"slot_id": str(slot.id)},
    ).json()

    response = client.post(
        f"/api/v1/admin/mock-interviews/{booked['id']}/complete",
        headers=admin_headers,
        json={
            "communication_score": 8,
            "confidence_score": 7,
            "technical_score": 9,
            "answer_structure_score": 8,
            "professional_presentation_score": 8,
            "overall_score": 82,
            "feedback": "Strong technical answers.",
            "recommendations": ["Practice concise answers"],
        },
    )

    assert response.status_code == 200
    assert response.json()["overall_score"] == 82

    candidate_feedback = client.get(
        f"/api/v1/candidate/mock-interviews/{booked['id']}/feedback", headers=candidate_headers
    )
    assert candidate_feedback.json()["overall_score"] == 82


async def test_complete_interview_validates_score_boundaries(client: TestClient) -> None:
    admin_headers = await role_client(client, "badscore.admin@example.com", "ADMIN")
    email = "badscore.candidate@example.com"
    candidate_headers = candidate_client(client, email)
    profile = await _profile_for(email)
    async with AsyncSessionLocal() as db:
        profile = await get_or_create_profile(db, profile.user_id)
        await credits_service.grant_credit(
            db, profile, CreditType.MOCK_INTERVIEW, 1, CreditTransactionReason.PROMOTIONAL_GRANT
        )
        slot = await mock_interview_service.create_slot(
            db, InterviewType.HR, _future(), _future(hours=25)
        )
    booked = client.post(
        "/api/v1/candidate/mock-interviews/book",
        headers=candidate_headers,
        json={"slot_id": str(slot.id)},
    ).json()

    response = client.post(
        f"/api/v1/admin/mock-interviews/{booked['id']}/complete",
        headers=admin_headers,
        json={
            "communication_score": 11,
            "confidence_score": 7,
            "technical_score": 9,
            "answer_structure_score": 8,
            "professional_presentation_score": 8,
            "overall_score": 82,
            "feedback": "Invalid.",
        },
    )

    assert response.status_code == 422


async def test_completed_interview_cannot_be_completed_again(client: TestClient) -> None:
    admin_headers = await role_client(client, "doublecomplete.admin@example.com", "ADMIN")
    email = "doublecomplete.candidate@example.com"
    candidate_headers = candidate_client(client, email)
    profile = await _profile_for(email)
    async with AsyncSessionLocal() as db:
        profile = await get_or_create_profile(db, profile.user_id)
        await credits_service.grant_credit(
            db, profile, CreditType.MOCK_INTERVIEW, 1, CreditTransactionReason.PROMOTIONAL_GRANT
        )
        slot = await mock_interview_service.create_slot(
            db, InterviewType.HR, _future(), _future(hours=25)
        )
    booked = client.post(
        "/api/v1/candidate/mock-interviews/book",
        headers=candidate_headers,
        json={"slot_id": str(slot.id)},
    ).json()
    payload = {
        "communication_score": 8,
        "confidence_score": 7,
        "technical_score": 9,
        "answer_structure_score": 8,
        "professional_presentation_score": 8,
        "overall_score": 82,
        "feedback": "Good.",
    }
    complete_url = f"/api/v1/admin/mock-interviews/{booked['id']}/complete"
    client.post(complete_url, headers=admin_headers, json=payload)

    second = client.post(complete_url, headers=admin_headers, json=payload)

    assert second.status_code == 409


# --- Credit management -----------------------------------------------


async def test_admin_can_grant_credit_and_candidate_balance_updates(client: TestClient) -> None:
    admin_headers = await role_client(client, "grant.admin@example.com", "ADMIN")
    email = "grant.candidate@example.com"
    candidate_headers = candidate_client(client, email)
    profile = await _profile_for(email)

    response = client.post(
        "/api/v1/admin/credits/grant",
        headers=admin_headers,
        json={
            "candidate_id": str(profile.id),
            "credit_type": "MOCK_INTERVIEW",
            "amount": 3,
            "reason": "PROMOTIONAL_GRANT",
            "description": "Promotional grant",
        },
    )

    assert response.status_code == 201
    assert response.json()["amount"] == 3

    balances = client.get("/api/v1/candidate/credits", headers=candidate_headers).json()
    mock_interview_balance = next(
        b["balance"] for b in balances if b["credit_type"] == "MOCK_INTERVIEW"
    )
    assert mock_interview_balance == 3

    transactions = client.get("/api/v1/admin/credits/transactions", headers=admin_headers).json()
    matching = [t for t in transactions["items"] if t["candidate"]["email"] == email]
    assert len(matching) == 1
    assert matching[0]["transaction"]["amount"] == 3


async def test_grant_credit_rejects_non_positive_amount(client: TestClient) -> None:
    admin_headers = await role_client(client, "grant.invalid.admin@example.com", "ADMIN")
    candidate_client(client, "grant.invalid.candidate@example.com")
    profile = await _profile_for("grant.invalid.candidate@example.com")

    response = client.post(
        "/api/v1/admin/credits/grant",
        headers=admin_headers,
        json={
            "candidate_id": str(profile.id),
            "credit_type": "MOCK_INTERVIEW",
            "amount": 0,
            "reason": "PROMOTIONAL_GRANT",
        },
    )

    assert response.status_code == 422


async def test_grant_credit_rejects_unsupported_type(client: TestClient) -> None:
    admin_headers = await role_client(client, "grant.badtype.admin@example.com", "ADMIN")
    candidate_client(client, "grant.badtype.candidate@example.com")
    profile = await _profile_for("grant.badtype.candidate@example.com")

    response = client.post(
        "/api/v1/admin/credits/grant",
        headers=admin_headers,
        json={
            "candidate_id": str(profile.id),
            "credit_type": "NOT_A_REAL_TYPE",
            "amount": 1,
            "reason": "PROMOTIONAL_GRANT",
        },
    )

    assert response.status_code == 422


async def test_grant_credit_for_nonexistent_candidate_returns_404(client: TestClient) -> None:
    admin_headers = await role_client(client, "grant.missing.admin@example.com", "ADMIN")
    fake_id = "00000000-0000-0000-0000-000000000000"

    response = client.post(
        "/api/v1/admin/credits/grant",
        headers=admin_headers,
        json={
            "candidate_id": fake_id,
            "credit_type": "MOCK_INTERVIEW",
            "amount": 1,
            "reason": "PROMOTIONAL_GRANT",
        },
    )

    assert response.status_code == 404


async def test_candidate_cannot_call_grant_credit_endpoint(client: TestClient) -> None:
    candidate_headers = candidate_client(client, "grant.denied.candidate@example.com")
    profile = await _profile_for("grant.denied.candidate@example.com")

    response = client.post(
        "/api/v1/admin/credits/grant",
        headers=candidate_headers,
        json={
            "candidate_id": str(profile.id),
            "credit_type": "MOCK_INTERVIEW",
            "amount": 100,
            "reason": "ADMIN_ADJUSTMENT",
        },
    )

    assert response.status_code == 403
