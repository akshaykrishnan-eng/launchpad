from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from app.db.session import AsyncSessionLocal
from app.models.role import Role
from app.models.user import User
from app.models.user_role import UserRole
from tests.helpers import auth_headers, candidate_client, register_and_login

VALID_URL = "https://www.linkedin.com/in/example-person/"


def test_get_linkedin_profile_is_null_when_none_exists(client: TestClient) -> None:
    headers = candidate_client(client, "linkedin.getnull@example.com")

    response = client.get("/api/v1/candidate/linkedin", headers=headers)

    assert response.status_code == 200
    assert response.json() is None


def test_create_linkedin_url(client: TestClient) -> None:
    headers = candidate_client(client, "linkedin.create@example.com")

    response = client.put(
        "/api/v1/candidate/linkedin", headers=headers, json={"profile_url": VALID_URL}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["profile_url"] == "https://linkedin.com/in/example-person"


def test_retrieve_saved_url(client: TestClient) -> None:
    headers = candidate_client(client, "linkedin.retrieve@example.com")
    client.put("/api/v1/candidate/linkedin", headers=headers, json={"profile_url": VALID_URL})

    response = client.get("/api/v1/candidate/linkedin", headers=headers)

    assert response.json()["profile_url"] == "https://linkedin.com/in/example-person"


def test_update_existing_url(client: TestClient) -> None:
    headers = candidate_client(client, "linkedin.update@example.com")
    client.put("/api/v1/candidate/linkedin", headers=headers, json={"profile_url": VALID_URL})

    response = client.put(
        "/api/v1/candidate/linkedin",
        headers=headers,
        json={"profile_url": "https://linkedin.com/in/updated-person"},
    )

    assert response.status_code == 200
    assert response.json()["profile_url"] == "https://linkedin.com/in/updated-person"
    # Still one profile, not a new version.
    again = client.get("/api/v1/candidate/linkedin", headers=headers).json()
    assert again["id"] == response.json()["id"]


def test_non_linkedin_url_is_rejected(client: TestClient) -> None:
    headers = candidate_client(client, "linkedin.wrongdomain@example.com")

    response = client.put(
        "/api/v1/candidate/linkedin",
        headers=headers,
        json={"profile_url": "https://example.com/profile"},
    )

    assert response.status_code == 422


def test_malformed_url_is_rejected(client: TestClient) -> None:
    headers = candidate_client(client, "linkedin.malformed@example.com")

    response = client.put(
        "/api/v1/candidate/linkedin", headers=headers, json={"profile_url": "not-a-url"}
    )

    assert response.status_code == 422


def test_non_profile_path_is_rejected(client: TestClient) -> None:
    headers = candidate_client(client, "linkedin.companypath@example.com")

    response = client.put(
        "/api/v1/candidate/linkedin",
        headers=headers,
        json={"profile_url": "https://linkedin.com/company/acme"},
    )

    assert response.status_code == 422


def test_empty_url_is_rejected(client: TestClient) -> None:
    headers = candidate_client(client, "linkedin.empty@example.com")

    response = client.put(
        "/api/v1/candidate/linkedin", headers=headers, json={"profile_url": "   "}
    )

    assert response.status_code == 422


def test_unauthenticated_request_is_rejected(client: TestClient) -> None:
    response = client.get("/api/v1/candidate/linkedin")

    assert response.status_code == 401


async def test_non_candidate_role_cannot_access_linkedin(client: TestClient) -> None:
    email = "linkedin.interviewer@example.com"
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

    response = client.get("/api/v1/candidate/linkedin", headers=auth_headers(tokens))

    assert response.status_code == 403
