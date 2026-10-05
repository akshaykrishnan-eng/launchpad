from fastapi.testclient import TestClient

from tests.helpers import candidate_client

VALID_EXPERIENCE = {
    "company": "Acme",
    "job_title": "Engineer",
    "start_date": "2022-01-01",
    "end_date": "2023-01-01",
    "is_current": False,
}


def test_create_experience(client: TestClient) -> None:
    headers = candidate_client(client, "exp.create@example.com")

    response = client.post(
        "/api/v1/candidate/experience", headers=headers, json=VALID_EXPERIENCE
    )

    assert response.status_code == 201
    assert response.json()["company"] == "Acme"


def test_update_experience(client: TestClient) -> None:
    headers = candidate_client(client, "exp.update@example.com")
    created = client.post(
        "/api/v1/candidate/experience", headers=headers, json=VALID_EXPERIENCE
    ).json()

    response = client.patch(
        f"/api/v1/candidate/experience/{created['id']}",
        headers=headers,
        json={"job_title": "Senior Engineer"},
    )

    assert response.status_code == 200
    assert response.json()["job_title"] == "Senior Engineer"


def test_delete_experience(client: TestClient) -> None:
    headers = candidate_client(client, "exp.delete@example.com")
    created = client.post(
        "/api/v1/candidate/experience", headers=headers, json=VALID_EXPERIENCE
    ).json()

    delete_response = client.delete(
        f"/api/v1/candidate/experience/{created['id']}", headers=headers
    )

    assert delete_response.status_code == 204
    assert client.get("/api/v1/candidate/experience", headers=headers).json() == []


def test_end_date_before_start_date_is_rejected_on_create(client: TestClient) -> None:
    headers = candidate_client(client, "exp.baddates@example.com")

    response = client.post(
        "/api/v1/candidate/experience",
        headers=headers,
        json={**VALID_EXPERIENCE, "start_date": "2023-01-01", "end_date": "2022-01-01"},
    )

    assert response.status_code == 422


def test_current_job_cannot_have_an_end_date(client: TestClient) -> None:
    headers = candidate_client(client, "exp.currentwithend@example.com")

    response = client.post(
        "/api/v1/candidate/experience",
        headers=headers,
        json={
            "company": "Acme",
            "job_title": "Engineer",
            "start_date": "2023-01-01",
            "end_date": "2024-01-01",
            "is_current": True,
        },
    )

    assert response.status_code == 422


def test_partial_update_revalidates_against_existing_state(client: TestClient) -> None:
    """A PATCH that only sends end_date must still be checked against
    the entry's existing start_date."""
    headers = candidate_client(client, "exp.partialbaddates@example.com")
    created = client.post(
        "/api/v1/candidate/experience",
        headers=headers,
        json={**VALID_EXPERIENCE, "start_date": "2023-01-01", "end_date": None},
    ).json()

    response = client.patch(
        f"/api/v1/candidate/experience/{created['id']}",
        headers=headers,
        json={"end_date": "2022-01-01"},
    )

    assert response.status_code == 422


def test_candidate_cannot_access_another_candidates_experience(client: TestClient) -> None:
    headers_a = candidate_client(client, "exp.owner@example.com")
    headers_b = candidate_client(client, "exp.intruder@example.com")
    created = client.post(
        "/api/v1/candidate/experience", headers=headers_a, json=VALID_EXPERIENCE
    ).json()

    patch_response = client.patch(
        f"/api/v1/candidate/experience/{created['id']}",
        headers=headers_b,
        json={"company": "Hacked"},
    )
    delete_response = client.delete(
        f"/api/v1/candidate/experience/{created['id']}", headers=headers_b
    )

    assert patch_response.status_code == 404
    assert delete_response.status_code == 404
