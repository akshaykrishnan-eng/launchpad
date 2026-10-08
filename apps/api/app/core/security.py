import hashlib
import secrets
import string
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.core.config import get_settings

settings = get_settings()

_password_hasher = PasswordHasher()

ACCESS_TOKEN_TYPE = "access"
PENDING_REGISTRATION_TOKEN_TYPE = "pending_registration"
OTP_LENGTH = 6


def hash_password(password: str) -> str:
    return _password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _password_hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def create_access_token(user_id: uuid.UUID) -> tuple[str, int]:
    """Returns (token, expires_in_seconds). Payload carries only the
    minimum needed to identify the subject; roles are re-checked against
    the database on every request rather than trusted from the token."""
    now = datetime.now(UTC)
    expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": str(user_id),
        "type": ACCESS_TOKEN_TYPE,
        "iat": now,
        "exp": now + expires_delta,
    }
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token, int(expires_delta.total_seconds())


class InvalidTokenError(Exception):
    pass


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
    except jwt.PyJWTError as exc:
        raise InvalidTokenError(str(exc)) from exc

    if payload.get("type") != ACCESS_TOKEN_TYPE:
        raise InvalidTokenError("Unexpected token type")

    return payload


def generate_refresh_token() -> str:
    """Opaque, high-entropy refresh token. Not a JWT: the server is the
    only party that can look it up, which is what makes revocation and
    rotation possible (a self-contained JWT refresh token cannot be
    invalidated before it expires without an extra server-side list)."""
    return secrets.token_urlsafe(48)


def hash_refresh_token(raw_token: str) -> str:
    """One-way hash stored in the database. Only the hash is persisted,
    so a database read alone never yields a usable refresh token."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def create_pending_registration_token(pending_registration_id: uuid.UUID) -> str:
    """Short-lived, signed token that lets the frontend carry a
    registration attempt across the start/verify/complete calls without
    exposing the PendingRegistration row's id as a bare, guessable
    bearer credential. Tagged with a distinct `type` (reusing the same
    JWT mechanism as access tokens, not a second one) so it can never
    decode successfully as an access token and can never reach an
    authenticated endpoint -- see decode_access_token's type check."""
    now = datetime.now(UTC)
    expires_delta = timedelta(minutes=settings.pending_registration_token_expire_minutes)
    payload = {
        "sub": str(pending_registration_id),
        "type": PENDING_REGISTRATION_TOKEN_TYPE,
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_pending_registration_token(token: str) -> uuid.UUID:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
    except jwt.PyJWTError as exc:
        raise InvalidTokenError(str(exc)) from exc

    if payload.get("type") != PENDING_REGISTRATION_TOKEN_TYPE:
        raise InvalidTokenError("Unexpected token type")

    try:
        return uuid.UUID(payload["sub"])
    except (KeyError, ValueError, AttributeError) as exc:
        raise InvalidTokenError("Invalid token subject") from exc


def generate_otp() -> str:
    """Cryptographically secure 6-digit numeric OTP -- secrets.choice,
    never random.random()/timestamps/UUID substrings."""
    return "".join(secrets.choice(string.digits) for _ in range(OTP_LENGTH))


def hash_otp(otp: str) -> str:
    """Reuses the same argon2 hasher as passwords: an OTP is a short-
    lived secret with the same one-way-storage requirement, and this
    avoids introducing a second hashing mechanism."""
    return _password_hasher.hash(otp)


def verify_otp(otp: str, otp_hash: str) -> bool:
    try:
        return _password_hasher.verify(otp_hash, otp)
    except VerifyMismatchError:
        return False
