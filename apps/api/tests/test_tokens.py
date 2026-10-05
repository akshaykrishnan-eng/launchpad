from datetime import UTC, datetime, timedelta

import jwt
from fastapi.testclient import TestClient

from app.core.config import get_settings
from tests.helpers import register_and_login

settings = get_settings()


def test_valid_access_token_grants_access(client: TestClient) -> None:
    tokens = register_and_login(client, "token.valid@example.com")

    response = client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"}
    )

    assert response.status_code == 200


def test_invalid_access_token_is_rejected(client: TestClient) -> None:
    response = client.get(
        "/api/v1/auth/me", headers={"Authorization": "Bearer not-a-real-token"}
    )

    assert response.status_code == 401


def test_missing_authentication_is_rejected(client: TestClient) -> None:
    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401


def test_expired_access_token_is_rejected(client: TestClient) -> None:
    tokens = register_and_login(client, "token.expired@example.com")

    unverified = jwt.decode(tokens["access_token"], options={"verify_signature": False})
    now = datetime.now(UTC)
    expired_token = jwt.encode(
        {**unverified, "iat": now - timedelta(hours=1), "exp": now - timedelta(minutes=1)},
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

    response = client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {expired_token}"}
    )

    assert response.status_code == 401


def test_refresh_token_returns_new_access_token(client: TestClient) -> None:
    tokens = register_and_login(client, "token.refresh@example.com")

    response = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    )

    assert response.status_code == 200
    new_tokens = response.json()
    assert isinstance(new_tokens["access_token"], str) and new_tokens["access_token"]
    # The refresh token is always rotated (random each time); the access
    # token is a deterministic JWT and can coincidentally be identical if
    # issued within the same second as the previous one.
    assert new_tokens["refresh_token"] != tokens["refresh_token"]


def test_refresh_token_is_rotated_old_one_cannot_be_reused(client: TestClient) -> None:
    tokens = register_and_login(client, "token.rotate@example.com")

    first_refresh = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    )
    assert first_refresh.status_code == 200

    reuse_attempt = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    )

    assert reuse_attempt.status_code == 401


def test_refresh_token_reuse_revokes_the_whole_chain(client: TestClient) -> None:
    """Presenting an already-rotated-out token is treated as theft: every
    active refresh token for that user is revoked, including the one that
    replaced the reused token."""
    tokens = register_and_login(client, "token.reuse@example.com")

    rotated = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    ).json()

    client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})

    response = client.post("/api/v1/auth/refresh", json={"refresh_token": rotated["refresh_token"]})

    assert response.status_code == 401


def test_invalid_refresh_token_is_rejected(client: TestClient) -> None:
    response = client.post("/api/v1/auth/refresh", json={"refresh_token": "garbage"})

    assert response.status_code == 401


def test_logout_revokes_refresh_token(client: TestClient) -> None:
    tokens = register_and_login(client, "token.logout@example.com")

    logout_response = client.post(
        "/api/v1/auth/logout", json={"refresh_token": tokens["refresh_token"]}
    )
    assert logout_response.status_code == 204

    reuse_attempt = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    )

    assert reuse_attempt.status_code == 401
