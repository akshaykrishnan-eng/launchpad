from fastapi.testclient import TestClient

from tests.helpers import candidate_client

VALID_URL = "https://linkedin.com/in/owner-person"


def test_candidate_sees_only_their_own_linkedin_profile(client: TestClient) -> None:
    headers_a = candidate_client(client, "linkedin.own.a@example.com")
    headers_b = candidate_client(client, "linkedin.own.b@example.com")
    client.put("/api/v1/candidate/linkedin", headers=headers_a, json={"profile_url": VALID_URL})

    profile_b = client.get("/api/v1/candidate/linkedin", headers=headers_b).json()

    assert profile_b is None


def test_updating_url_only_affects_the_caller(client: TestClient) -> None:
    headers_a = candidate_client(client, "linkedin.isolated.a@example.com")
    headers_b = candidate_client(client, "linkedin.isolated.b@example.com")
    client.put("/api/v1/candidate/linkedin", headers=headers_a, json={"profile_url": VALID_URL})

    client.put(
        "/api/v1/candidate/linkedin",
        headers=headers_b,
        json={"profile_url": "https://linkedin.com/in/other-person"},
    )

    profile_a = client.get("/api/v1/candidate/linkedin", headers=headers_a).json()
    assert profile_a["profile_url"] == VALID_URL


def test_candidate_cannot_see_another_candidates_review(client: TestClient) -> None:
    headers_a = candidate_client(client, "linkedin.review.owner@example.com")
    headers_b = candidate_client(client, "linkedin.review.intruder@example.com")
    client.put("/api/v1/candidate/linkedin", headers=headers_a, json={"profile_url": VALID_URL})
    client.post("/api/v1/candidate/linkedin/review", headers=headers_a)

    review_b = client.get("/api/v1/candidate/linkedin/review", headers=headers_b).json()

    assert review_b is None


def test_requesting_review_only_affects_the_callers_own_profile(client: TestClient) -> None:
    headers_a = candidate_client(client, "linkedin.request.a@example.com")
    headers_b = candidate_client(client, "linkedin.request.b@example.com")
    client.put("/api/v1/candidate/linkedin", headers=headers_a, json={"profile_url": VALID_URL})
    client.put(
        "/api/v1/candidate/linkedin",
        headers=headers_b,
        json={"profile_url": "https://linkedin.com/in/b-person"},
    )

    client.post("/api/v1/candidate/linkedin/review", headers=headers_a)

    review_b = client.get("/api/v1/candidate/linkedin/review", headers=headers_b).json()
    assert review_b is None
