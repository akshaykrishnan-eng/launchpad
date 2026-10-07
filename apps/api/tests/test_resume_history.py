from fastapi.testclient import TestClient

from tests.helpers import VALID_PDF_BYTES, candidate_client, upload_resume


def _upload(client: TestClient, headers: dict, n: int) -> None:
    for _ in range(n):
        upload_resume(client, headers, "resume.pdf", VALID_PDF_BYTES, "application/pdf")


def test_unauthenticated_requests_are_rejected(client: TestClient) -> None:
    assert client.get("/api/v1/candidate/resumes/history").status_code == 401


def test_empty_history_before_any_upload(client: TestClient) -> None:
    headers = candidate_client(client, "resume.history.empty@example.com")

    response = client.get("/api/v1/candidate/resumes/history", headers=headers)
    body = response.json()

    assert response.status_code == 200
    assert body["items"] == []
    assert body["total"] == 0


def test_history_is_newest_version_first(client: TestClient) -> None:
    headers = candidate_client(client, "resume.history.order@example.com")
    _upload(client, headers, 3)

    body = client.get("/api/v1/candidate/resumes/history", headers=headers).json()

    versions = [row["version"] for row in body["items"]]
    assert versions == [3, 2, 1]
    assert body["total"] == 3
    # The newest row is the one flagged as the current version.
    assert body["items"][0]["is_latest"] is True
    assert body["items"][1]["is_latest"] is False


def test_history_is_paginated_server_side(client: TestClient) -> None:
    headers = candidate_client(client, "resume.history.paginated@example.com")
    _upload(client, headers, 7)

    page_1 = client.get(
        "/api/v1/candidate/resumes/history",
        params={"page": 1, "page_size": 5},
        headers=headers,
    ).json()
    page_2 = client.get(
        "/api/v1/candidate/resumes/history",
        params={"page": 2, "page_size": 5},
        headers=headers,
    ).json()

    assert page_1["total"] == 7
    assert len(page_1["items"]) == 5
    assert len(page_2["items"]) == 2

    page_1_ids = {row["id"] for row in page_1["items"]}
    page_2_ids = {row["id"] for row in page_2["items"]}
    assert page_1_ids.isdisjoint(page_2_ids)


def test_history_page_size_defaults_and_is_clamped(client: TestClient) -> None:
    headers = candidate_client(client, "resume.history.pagedefault@example.com")

    default_page = client.get("/api/v1/candidate/resumes/history", headers=headers).json()
    assert default_page["page"] == 1
    assert default_page["page_size"] == 20

    too_large = client.get(
        "/api/v1/candidate/resumes/history", params={"page_size": 500}, headers=headers
    )
    assert too_large.status_code == 422


def test_history_is_scoped_to_the_caller(client: TestClient) -> None:
    headers_a = candidate_client(client, "resume.history.iso.a@example.com")
    headers_b = candidate_client(client, "resume.history.iso.b@example.com")
    _upload(client, headers_a, 2)

    body_b = client.get("/api/v1/candidate/resumes/history", headers=headers_b).json()

    assert body_b["items"] == []
    assert body_b["total"] == 0


def test_no_storage_key_or_internal_fields_are_exposed(client: TestClient) -> None:
    headers = candidate_client(client, "resume.history.fields@example.com")
    _upload(client, headers, 1)

    body = client.get("/api/v1/candidate/resumes/history", headers=headers).json()
    row = body["items"][0]

    assert "storage_key" not in row
    assert "candidate_profile_id" not in row
