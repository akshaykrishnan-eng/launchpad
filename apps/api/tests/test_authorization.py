from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.role import Role
from app.models.user import User
from app.models.user_role import UserRole
from tests.helpers import login, register_and_login


def _auth_header(tokens: dict) -> dict:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


async def _promote_to_admin(email: str) -> None:
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one()
        admin_role = (await db.execute(select(Role).where(Role.name == "ADMIN"))).scalar_one()
        db.add(UserRole(user_id=user.id, role_id=admin_role.id))
        await db.commit()


def test_unauthenticated_request_is_rejected(client: TestClient) -> None:
    response = client.get("/api/v1/rbac-demo/admin-only")

    assert response.status_code == 401


def test_authenticated_candidate_can_access_me(client: TestClient) -> None:
    tokens = register_and_login(client, "rbac.candidate@example.com")

    response = client.get("/api/v1/auth/me", headers=_auth_header(tokens))

    assert response.status_code == 200
    assert response.json()["roles"] == ["CANDIDATE"]


def test_candidate_is_forbidden_from_admin_endpoint(client: TestClient) -> None:
    tokens = register_and_login(client, "rbac.forbidden@example.com")

    response = client.get("/api/v1/rbac-demo/admin-only", headers=_auth_header(tokens))

    assert response.status_code == 403


async def test_admin_can_access_admin_endpoint(client: TestClient) -> None:
    email = "rbac.admin@example.com"
    register_and_login(client, email)
    await _promote_to_admin(email)
    # Authorization is re-checked against the database on every request
    # rather than trusted from the token, so a role granted after login
    # takes effect on the very next request with a fresh access token.
    tokens = login(client, email).json()

    response = client.get("/api/v1/rbac-demo/admin-only", headers=_auth_header(tokens))

    assert response.status_code == 200
