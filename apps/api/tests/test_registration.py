from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.user import User
from tests.helpers import DEFAULT_PASSWORD, register


def test_successful_registration_returns_safe_user(client: TestClient) -> None:
    response = register(client, "new.user@example.com")

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "new.user@example.com"
    assert body["is_active"] is True
    assert body["roles"] == ["CANDIDATE"]
    assert "password" not in body
    assert "password_hash" not in body


def test_duplicate_email_is_rejected(client: TestClient) -> None:
    register(client, "duplicate@example.com")

    response = register(client, "duplicate@example.com")

    assert response.status_code == 409


def test_invalid_email_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "not-an-email", "password": DEFAULT_PASSWORD},
    )

    assert response.status_code == 422


def test_short_password_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "short.pw@example.com", "password": "short"},
    )

    assert response.status_code == 422


async def test_password_is_hashed_not_stored_in_plaintext(client: TestClient) -> None:
    register(client, "hashed@example.com")

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == "hashed@example.com"))
        user = result.scalar_one()

    assert user.password_hash != DEFAULT_PASSWORD
    assert user.password_hash.startswith("$argon2")
