from datetime import UTC, datetime, timedelta

import jwt
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import hash_refresh_token
from app.db.session import AsyncSessionLocal
from app.models.refresh_token import RefreshToken
from tests.helpers import register_and_login

settings = get_settings()


async def _backdate_revocation(raw_token: str, seconds_ago: int) -> None:
    """Pushes a refresh token's revoked_at far enough into the past that
    it falls outside the reuse grace window, so tests can exercise real
    reuse detection without actually sleeping for several seconds."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == hash_refresh_token(raw_token))
        )
        token = result.scalar_one()
        token.revoked_at = datetime.now(UTC) - timedelta(seconds=seconds_ago)
        await db.commit()


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


def test_refresh_token_reuse_within_grace_window_is_tolerated(client: TestClient) -> None:
    """Two requests can legitimately race on the same stale refresh token
    (e.g. two in-flight requests when the access token expires). The
    loser presenting the now-rotated-out token is fast-forwarded onto the
    current chain tip instead of being treated as theft -- otherwise an
    honestly-authenticated session gets logged out by its own concurrent
    requests."""
    tokens = register_and_login(client, "token.rotate@example.com")

    first_refresh = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    )
    assert first_refresh.status_code == 200

    reuse_attempt = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    )
    assert reuse_attempt.status_code == 200

    new_tokens = reuse_attempt.json()
    me_response = client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {new_tokens['access_token']}"}
    )
    assert me_response.status_code == 200


async def test_refresh_token_reuse_outside_grace_window_revokes_the_whole_chain(
    client: TestClient,
) -> None:
    """Presenting an already-rotated-out token well after the grace
    window has closed is treated as theft: every active refresh token for
    that user is revoked, including the one that replaced the reused
    token."""
    tokens = register_and_login(client, "token.reuse@example.com")

    rotated = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    ).json()

    await _backdate_revocation(
        tokens["refresh_token"], settings.refresh_token_reuse_grace_seconds + 5
    )

    reuse_attempt = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    )
    assert reuse_attempt.status_code == 401

    response = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": rotated["refresh_token"]}
    )
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
