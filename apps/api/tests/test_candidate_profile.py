from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from app.db.session import AsyncSessionLocal
from app.models.role import Role
from app.models.user import User
from app.models.user_role import UserRole
from tests.helpers import auth_headers, candidate_client, register_and_login


async def _strip_candidate_role_and_make_interviewer(email: str) -> None:
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one()
        await db.execute(delete(UserRole).where(UserRole.user_id == user.id))
        interviewer_role = (
            await db.execute(select(Role).where(Role.name == "INTERVIEWER"))
        ).scalar_one()
        db.add(UserRole(user_id=user.id, role_id=interviewer_role.id))
        await db.commit()


def test_get_profile_auto_creates_an_empty_profile(client: TestClient) -> None:
    headers = candidate_client(client, "profile.autocreate@example.com")

    response = client.get("/api/v1/candidate/profile", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["first_name"] is None
    assert body["completion_percentage"] == 0


def test_candidate_can_update_profile(client: TestClient) -> None:
    headers = candidate_client(client, "profile.update@example.com")

    response = client.patch(
        "/api/v1/candidate/profile",
        headers=headers,
        json={
            "first_name": "Dana",
            "last_name": "Smith",
            "mobile_number": "+1234567890",
            "current_city": "Austin",
            "current_status": "STUDENT",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["first_name"] == "Dana"
    assert body["current_status"] == "STUDENT"
    assert body["completion_percentage"] == 20


def test_partial_update_does_not_clear_other_fields(client: TestClient) -> None:
    headers = candidate_client(client, "profile.partial@example.com")
    client.patch(
        "/api/v1/candidate/profile", headers=headers, json={"first_name": "Dana"}
    )

    response = client.patch(
        "/api/v1/candidate/profile", headers=headers, json={"last_name": "Smith"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["first_name"] == "Dana"
    assert body["last_name"] == "Smith"


def test_invalid_current_status_is_rejected(client: TestClient) -> None:
    headers = candidate_client(client, "profile.invalidstatus@example.com")

    response = client.patch(
        "/api/v1/candidate/profile", headers=headers, json={"current_status": "ON_VACATION"}
    )

    assert response.status_code == 422


def test_unauthenticated_request_is_rejected(client: TestClient) -> None:
    response = client.get("/api/v1/candidate/profile")

    assert response.status_code == 401


async def test_non_candidate_role_cannot_access_candidate_endpoints(
    client: TestClient,
) -> None:
    email = "profile.interviewer@example.com"
    register_and_login(client, email)
    await _strip_candidate_role_and_make_interviewer(email)
    tokens = client.post(
        "/api/v1/auth/login", json={"email": email, "password": "correct-horse-battery-staple"}
    ).json()

    response = client.get("/api/v1/candidate/profile", headers=auth_headers(tokens))

    assert response.status_code == 403


def test_each_candidate_gets_their_own_profile(client: TestClient) -> None:
    headers_a = candidate_client(client, "profile.a@example.com")
    headers_b = candidate_client(client, "profile.b@example.com")

    client.patch("/api/v1/candidate/profile", headers=headers_a, json={"first_name": "A"})
    client.patch("/api/v1/candidate/profile", headers=headers_b, json={"first_name": "B"})

    profile_a = client.get("/api/v1/candidate/profile", headers=headers_a).json()
    profile_b = client.get("/api/v1/candidate/profile", headers=headers_b).json()

    assert profile_a["first_name"] == "A"
    assert profile_b["first_name"] == "B"
    assert profile_a["id"] != profile_b["id"]


def test_completion_endpoint_matches_profile_percentage(client: TestClient) -> None:
    headers = candidate_client(client, "profile.completion@example.com")
    client.patch(
        "/api/v1/candidate/profile",
        headers=headers,
        json={
            "first_name": "Dana",
            "last_name": "Smith",
            "mobile_number": "123",
            "current_city": "Austin",
            "current_status": "STUDENT",
        },
    )

    profile = client.get("/api/v1/candidate/profile", headers=headers).json()
    completion = client.get("/api/v1/candidate/completion", headers=headers).json()

    assert profile["completion_percentage"] == completion["completion_percentage"] == 20
