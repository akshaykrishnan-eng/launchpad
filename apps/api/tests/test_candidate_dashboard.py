from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from app.db.session import AsyncSessionLocal
from app.models.role import Role
from app.models.user import User
from app.models.user_role import UserRole
from tests.helpers import auth_headers, candidate_client, register_and_login

FULL_PERSONAL_INFO = {
    "first_name": "Hank",
    "last_name": "Lee",
    "mobile_number": "555-1234",
    "current_city": "NYC",
    "current_status": "STUDENT",
}


def test_unauthenticated_request_is_rejected(client: TestClient) -> None:
    response = client.get("/api/v1/candidate/dashboard")

    assert response.status_code == 401


async def test_non_candidate_role_cannot_access_dashboard(client: TestClient) -> None:
    email = "dashboard.interviewer@example.com"
    register_and_login(client, email)

    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one()
        await db.execute(delete(UserRole).where(UserRole.user_id == user.id))
        interviewer_role = (
            await db.execute(select(Role).where(Role.name == "INTERVIEWER"))
        ).scalar_one()
        db.add(UserRole(user_id=user.id, role_id=interviewer_role.id))
        await db.commit()

    tokens = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "correct-horse-battery-staple"},
    ).json()

    response = client.get("/api/v1/candidate/dashboard", headers=auth_headers(tokens))

    assert response.status_code == 403


def test_dashboard_returns_candidate_name(client: TestClient) -> None:
    headers = candidate_client(client, "dashboard.name@example.com")
    client.patch("/api/v1/candidate/profile", headers=headers, json=FULL_PERSONAL_INFO)

    response = client.get("/api/v1/candidate/dashboard", headers=headers)

    assert response.status_code == 200
    assert response.json()["candidate"] == {"first_name": "Hank", "last_name": "Lee"}


def test_dashboard_matches_a_fresh_profiles_zero_state(client: TestClient) -> None:
    headers = candidate_client(client, "dashboard.fresh@example.com")

    body = client.get("/api/v1/candidate/dashboard", headers=headers).json()

    assert body["candidate"] == {"first_name": None, "last_name": None}
    assert body["profile_completion"]["percentage"] == 0
    assert all(v is False for v in body["profile_completion"]["components"].values())
    assert body["next_action"]["type"] == "PERSONAL_INFORMATION"


def test_dashboard_percentage_and_components_reflect_profile_state(client: TestClient) -> None:
    headers = candidate_client(client, "dashboard.partial@example.com")
    client.patch("/api/v1/candidate/profile", headers=headers, json=FULL_PERSONAL_INFO)
    client.post(
        "/api/v1/candidate/education",
        headers=headers,
        json={"institution": "State U", "degree": "BSc"},
    )

    body = client.get("/api/v1/candidate/dashboard", headers=headers).json()

    assert body["profile_completion"]["percentage"] == 40
    components = body["profile_completion"]["components"]
    assert components["personal_information"] is True
    assert components["education"] is True
    assert components["skills"] is False
    assert body["next_action"]["type"] == "SKILLS"


def test_fully_completed_profile_returns_profile_complete(client: TestClient) -> None:
    headers = candidate_client(client, "dashboard.complete@example.com")
    client.patch("/api/v1/candidate/profile", headers=headers, json=FULL_PERSONAL_INFO)
    client.post(
        "/api/v1/candidate/education",
        headers=headers,
        json={"institution": "State U", "degree": "BSc"},
    )
    client.post("/api/v1/candidate/skills", headers=headers, json={"name": "Python"})
    client.post(
        "/api/v1/candidate/experience",
        headers=headers,
        json={
            "company": "Acme",
            "job_title": "Intern",
            "start_date": "2023-01-01",
            "is_current": True,
        },
    )
    client.patch(
        "/api/v1/candidate/preferences",
        headers=headers,
        json={"preferred_roles": ["Dev"], "preferred_locations": ["Remote"]},
    )
    client.patch(
        "/api/v1/candidate/profile", headers=headers, json={"career_goal": "Be a dev"}
    )

    body = client.get("/api/v1/candidate/dashboard", headers=headers).json()

    assert body["profile_completion"]["percentage"] == 100
    assert all(v is True for v in body["profile_completion"]["components"].values())
    assert body["next_action"]["type"] == "PROFILE_COMPLETE"


def test_dashboard_does_not_expose_another_candidates_information(client: TestClient) -> None:
    headers_a = candidate_client(client, "dashboard.a@example.com")
    headers_b = candidate_client(client, "dashboard.b@example.com")
    client.patch(
        "/api/v1/candidate/profile",
        headers=headers_a,
        json={**FULL_PERSONAL_INFO, "first_name": "Alice"},
    )

    body_b = client.get("/api/v1/candidate/dashboard", headers=headers_b).json()

    assert body_b["candidate"]["first_name"] != "Alice"
    assert body_b["profile_completion"]["percentage"] == 0
