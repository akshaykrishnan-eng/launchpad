from fastapi.testclient import TestClient

from tests.helpers import candidate_client


def test_add_skill(client: TestClient) -> None:
    headers = candidate_client(client, "skill.add@example.com")

    response = client.post(
        "/api/v1/candidate/skills", headers=headers, json={"name": "Python"}
    )

    assert response.status_code == 201
    assert response.json()["name"] == "Python"


def test_list_skills(client: TestClient) -> None:
    headers = candidate_client(client, "skill.list@example.com")
    client.post("/api/v1/candidate/skills", headers=headers, json={"name": "Python"})
    client.post("/api/v1/candidate/skills", headers=headers, json={"name": "SQL"})

    response = client.get("/api/v1/candidate/skills", headers=headers)

    assert response.status_code == 200
    names = {s["name"] for s in response.json()}
    assert names == {"Python", "SQL"}


def test_remove_skill(client: TestClient) -> None:
    headers = candidate_client(client, "skill.remove@example.com")
    created = client.post(
        "/api/v1/candidate/skills", headers=headers, json={"name": "Python"}
    ).json()

    delete_response = client.delete(
        f"/api/v1/candidate/skills/{created['id']}", headers=headers
    )
    list_response = client.get("/api/v1/candidate/skills", headers=headers)

    assert delete_response.status_code == 204
    assert list_response.json() == []


def test_duplicate_skill_is_rejected(client: TestClient) -> None:
    headers = candidate_client(client, "skill.duplicate@example.com")
    client.post("/api/v1/candidate/skills", headers=headers, json={"name": "Python"})

    response = client.post(
        "/api/v1/candidate/skills", headers=headers, json={"name": "Python"}
    )

    assert response.status_code == 409


def test_duplicate_skill_is_case_insensitive(client: TestClient) -> None:
    headers = candidate_client(client, "skill.case@example.com")
    client.post("/api/v1/candidate/skills", headers=headers, json={"name": "Python"})

    response = client.post(
        "/api/v1/candidate/skills", headers=headers, json={"name": "python"}
    )

    assert response.status_code == 409


def test_two_candidates_can_each_have_the_same_skill(client: TestClient) -> None:
    """The skill catalog is shared; the per-candidate link is not."""
    headers_a = candidate_client(client, "skill.shared.a@example.com")
    headers_b = candidate_client(client, "skill.shared.b@example.com")

    response_a = client.post(
        "/api/v1/candidate/skills", headers=headers_a, json={"name": "Python"}
    )
    response_b = client.post(
        "/api/v1/candidate/skills", headers=headers_b, json={"name": "Python"}
    )

    assert response_a.status_code == response_b.status_code == 201


def test_candidate_cannot_remove_another_candidates_skill(client: TestClient) -> None:
    headers_a = candidate_client(client, "skill.owner@example.com")
    headers_b = candidate_client(client, "skill.intruder@example.com")
    created = client.post(
        "/api/v1/candidate/skills", headers=headers_a, json={"name": "Python"}
    ).json()

    response = client.delete(f"/api/v1/candidate/skills/{created['id']}", headers=headers_b)

    assert response.status_code == 404
    still_there = client.get("/api/v1/candidate/skills", headers=headers_a).json()
    assert len(still_there) == 1
