from fastapi.testclient import TestClient

from tests.helpers import candidate_client


def test_get_preferences_auto_creates_empty_row(client: TestClient) -> None:
    headers = candidate_client(client, "pref.get@example.com")

    response = client.get("/api/v1/candidate/preferences", headers=headers)

    assert response.status_code == 200
    assert response.json() == {"preferred_roles": [], "preferred_locations": []}


def test_update_preferences(client: TestClient) -> None:
    headers = candidate_client(client, "pref.update@example.com")

    response = client.patch(
        "/api/v1/candidate/preferences",
        headers=headers,
        json={
            "preferred_roles": ["Software Developer", "Data Analyst"],
            "preferred_locations": ["Remote", "Austin"],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["preferred_roles"] == ["Software Developer", "Data Analyst"]
    assert body["preferred_locations"] == ["Remote", "Austin"]


def test_preferences_are_not_limited_to_a_hardcoded_list(client: TestClient) -> None:
    """The brief is explicit that preferred roles must not be restricted
    to the example list -- any reasonable free-text role is accepted."""
    headers = candidate_client(client, "pref.custom@example.com")

    response = client.patch(
        "/api/v1/candidate/preferences",
        headers=headers,
        json={"preferred_roles": ["Underwater Basket Weaver"], "preferred_locations": []},
    )

    assert response.status_code == 200
    assert response.json()["preferred_roles"] == ["Underwater Basket Weaver"]


def test_blank_preference_value_is_rejected(client: TestClient) -> None:
    headers = candidate_client(client, "pref.blank@example.com")

    response = client.patch(
        "/api/v1/candidate/preferences",
        headers=headers,
        json={"preferred_roles": ["   "], "preferred_locations": []},
    )

    assert response.status_code == 422


def test_duplicate_preference_values_are_deduplicated(client: TestClient) -> None:
    headers = candidate_client(client, "pref.dedup@example.com")

    response = client.patch(
        "/api/v1/candidate/preferences",
        headers=headers,
        json={
            "preferred_roles": ["Software Developer", "software developer"],
            "preferred_locations": [],
        },
    )

    assert response.status_code == 200
    assert response.json()["preferred_roles"] == ["Software Developer"]


def test_too_many_preference_values_is_rejected(client: TestClient) -> None:
    headers = candidate_client(client, "pref.toomany@example.com")

    response = client.patch(
        "/api/v1/candidate/preferences",
        headers=headers,
        json={"preferred_roles": [f"Role {i}" for i in range(11)], "preferred_locations": []},
    )

    assert response.status_code == 422


def test_candidates_have_independent_preferences(client: TestClient) -> None:
    headers_a = candidate_client(client, "pref.a@example.com")
    headers_b = candidate_client(client, "pref.b@example.com")

    client.patch(
        "/api/v1/candidate/preferences",
        headers=headers_a,
        json={"preferred_roles": ["Role A"], "preferred_locations": []},
    )

    preferences_b = client.get("/api/v1/candidate/preferences", headers=headers_b).json()

    assert preferences_b["preferred_roles"] == []
