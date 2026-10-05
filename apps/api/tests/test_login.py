from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.user import User
from tests.helpers import login, register


def test_login_with_valid_credentials_returns_tokens(client: TestClient) -> None:
    register(client, "login.valid@example.com")

    response = login(client, "login.valid@example.com")

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str) and body["access_token"]
    assert isinstance(body["refresh_token"], str) and body["refresh_token"]
    assert body["expires_in"] > 0


def test_login_with_wrong_password_is_rejected(client: TestClient) -> None:
    register(client, "login.wrong@example.com")

    response = login(client, "login.wrong@example.com", password="totally-wrong-password")

    assert response.status_code == 401


def test_login_with_unknown_email_gives_same_error_as_wrong_password(
    client: TestClient,
) -> None:
    unknown = login(client, "does.not.exist@example.com")
    register(client, "known.user@example.com")
    wrong_password = login(client, "known.user@example.com", password="totally-wrong-password")

    assert unknown.status_code == wrong_password.status_code == 401
    assert unknown.json()["detail"] == wrong_password.json()["detail"]


async def test_login_with_inactive_user_is_rejected(client: TestClient) -> None:
    register(client, "inactive@example.com")

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == "inactive@example.com"))
        user = result.scalar_one()
        user.is_active = False
        await db.commit()

    response = login(client, "inactive@example.com")

    assert response.status_code == 401
