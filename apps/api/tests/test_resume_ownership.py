from fastapi.testclient import TestClient

from tests.helpers import VALID_PDF_BYTES, candidate_client, upload_resume


def _upload_one(client: TestClient, headers: dict) -> str:
    response = upload_resume(client, headers, "resume.pdf", VALID_PDF_BYTES, "application/pdf")
    return response.json()["id"]


def test_candidate_sees_only_their_own_resumes(client: TestClient) -> None:
    headers_a = candidate_client(client, "own.resumes.a@example.com")
    headers_b = candidate_client(client, "own.resumes.b@example.com")
    _upload_one(client, headers_a)

    resumes_b = client.get("/api/v1/candidate/resumes", headers=headers_b).json()

    assert resumes_b == []


def test_candidate_cannot_fetch_another_candidates_resume(client: TestClient) -> None:
    headers_a = candidate_client(client, "fetch.owner@example.com")
    headers_b = candidate_client(client, "fetch.intruder@example.com")
    resume_id = _upload_one(client, headers_a)

    response = client.get(f"/api/v1/candidate/resumes/{resume_id}", headers=headers_b)

    assert response.status_code == 404


def test_candidate_cannot_download_another_candidates_resume(client: TestClient) -> None:
    headers_a = candidate_client(client, "download.owner@example.com")
    headers_b = candidate_client(client, "download.intruder@example.com")
    resume_id = _upload_one(client, headers_a)

    response = client.get(
        f"/api/v1/candidate/resumes/{resume_id}/download", headers=headers_b
    )

    assert response.status_code == 404


def test_owner_can_download_their_own_resume_with_matching_content(client: TestClient) -> None:
    headers = candidate_client(client, "download.self@example.com")
    resume_id = _upload_one(client, headers)

    response = client.get(f"/api/v1/candidate/resumes/{resume_id}/download", headers=headers)

    assert response.status_code == 200
    assert response.content == VALID_PDF_BYTES
    assert "resume.pdf" in response.headers["content-disposition"]


def test_candidate_cannot_request_review_for_another_candidates_resume(
    client: TestClient,
) -> None:
    headers_a = candidate_client(client, "review.owner@example.com")
    headers_b = candidate_client(client, "review.intruder@example.com")
    resume_id = _upload_one(client, headers_a)

    response = client.post(
        f"/api/v1/candidate/resumes/{resume_id}/review", headers=headers_b
    )

    assert response.status_code == 404


def test_candidate_cannot_view_another_candidates_review(client: TestClient) -> None:
    headers_a = candidate_client(client, "viewreview.owner@example.com")
    headers_b = candidate_client(client, "viewreview.intruder@example.com")
    resume_id = _upload_one(client, headers_a)
    client.post(f"/api/v1/candidate/resumes/{resume_id}/review", headers=headers_a)

    response = client.get(f"/api/v1/candidate/resumes/{resume_id}/review", headers=headers_b)

    assert response.status_code == 404
