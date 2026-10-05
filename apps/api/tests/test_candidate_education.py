from fastapi.testclient import TestClient

from tests.helpers import candidate_client

VALID_EDUCATION = {
    "institution": "State University",
    "degree": "BSc",
    "specialization": "CS",
    "start_year": 2020,
    "graduation_year": 2024,
}


def test_create_education(client: TestClient) -> None:
    headers = candidate_client(client, "edu.create@example.com")

    response = client.post(
        "/api/v1/candidate/education", headers=headers, json=VALID_EDUCATION
    )

    assert response.status_code == 201
    assert response.json()["institution"] == "State University"


def test_list_supports_multiple_entries(client: TestClient) -> None:
    headers = candidate_client(client, "edu.multiple@example.com")
    client.post("/api/v1/candidate/education", headers=headers, json=VALID_EDUCATION)
    client.post(
        "/api/v1/candidate/education",
        headers=headers,
        json={**VALID_EDUCATION, "institution": "Other College"},
    )

    response = client.get("/api/v1/candidate/education", headers=headers)

    assert response.status_code == 200
    assert len(response.json()) == 2


def test_update_education(client: TestClient) -> None:
    headers = candidate_client(client, "edu.update@example.com")
    created = client.post(
        "/api/v1/candidate/education", headers=headers, json=VALID_EDUCATION
    ).json()

    response = client.patch(
        f"/api/v1/candidate/education/{created['id']}",
        headers=headers,
        json={"institution": "Renamed University"},
    )

    assert response.status_code == 200
    assert response.json()["institution"] == "Renamed University"


def test_delete_education(client: TestClient) -> None:
    headers = candidate_client(client, "edu.delete@example.com")
    created = client.post(
        "/api/v1/candidate/education", headers=headers, json=VALID_EDUCATION
    ).json()

    delete_response = client.delete(
        f"/api/v1/candidate/education/{created['id']}", headers=headers
    )
    list_response = client.get("/api/v1/candidate/education", headers=headers)

    assert delete_response.status_code == 204
    assert list_response.json() == []


def test_graduation_year_before_start_year_is_rejected_on_create(client: TestClient) -> None:
    headers = candidate_client(client, "edu.baddates.create@example.com")

    response = client.post(
        "/api/v1/candidate/education",
        headers=headers,
        json={**VALID_EDUCATION, "start_year": 2024, "graduation_year": 2020},
    )

    assert response.status_code == 422


def test_graduation_year_before_start_year_is_rejected_on_partial_update(
    client: TestClient,
) -> None:
    """A PATCH that only sends graduation_year must still be checked
    against the entry's existing start_year."""
    headers = candidate_client(client, "edu.baddates.update@example.com")
    created = client.post(
        "/api/v1/candidate/education",
        headers=headers,
        json={**VALID_EDUCATION, "start_year": 2020, "graduation_year": 2024},
    ).json()

    response = client.patch(
        f"/api/v1/candidate/education/{created['id']}",
        headers=headers,
        json={"graduation_year": 2019},
    )

    assert response.status_code == 422


def test_candidate_cannot_access_another_candidates_education(client: TestClient) -> None:
    headers_a = candidate_client(client, "edu.owner@example.com")
    headers_b = candidate_client(client, "edu.intruder@example.com")
    created = client.post(
        "/api/v1/candidate/education", headers=headers_a, json=VALID_EDUCATION
    ).json()

    patch_response = client.patch(
        f"/api/v1/candidate/education/{created['id']}",
        headers=headers_b,
        json={"institution": "Hacked"},
    )
    delete_response = client.delete(
        f"/api/v1/candidate/education/{created['id']}", headers=headers_b
    )

    assert patch_response.status_code == 404
    assert delete_response.status_code == 404
    # And candidate A's record is untouched.
    still_there = client.get("/api/v1/candidate/education", headers=headers_a).json()
    assert still_there[0]["institution"] == "State University"
