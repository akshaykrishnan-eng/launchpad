import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.roles import DEFAULT_REGISTRATION_ROLE
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.models.user_role import UserRole
from app.schemas.auth import TokenResponse
from app.services.roles import assign_role, get_role_by_name

settings = get_settings()


class EmailAlreadyRegisteredError(Exception):
    pass


class InvalidCredentialsError(Exception):
    """Covers both unknown email and wrong password, deliberately
    indistinguishable to the caller to avoid account enumeration."""


class InactiveUserError(Exception):
    pass


class InvalidRefreshTokenError(Exception):
    pass


class RevokedRefreshTokenError(Exception):
    """Raised when a refresh token that was already rotated out (or
    explicitly revoked) is presented again -- a signal of possible theft."""


_WITH_ROLES = selectinload(User.user_roles).selectinload(UserRole.role)


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).options(_WITH_ROLES).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    result = await db.execute(select(User).options(_WITH_ROLES).where(User.id == user_id))
    return result.scalar_one_or_none()


def user_role_names(user: User) -> list[str]:
    return [user_role.role.name for user_role in user.user_roles]


async def register_user(db: AsyncSession, email: str, password: str) -> User:
    existing = await get_user_by_email(db, email)
    if existing is not None:
        raise EmailAlreadyRegisteredError

    user = User(email=email, password_hash=hash_password(password))
    db.add(user)

    try:
        await db.flush()
    except IntegrityError as exc:
        # The email was free when we checked above but another request
        # won the race and registered it first; the unique constraint is
        # the actual source of truth here, not the earlier SELECT.
        await db.rollback()
        raise EmailAlreadyRegisteredError from exc

    default_role = await get_role_by_name(db, DEFAULT_REGISTRATION_ROLE)
    if default_role is not None:
        await assign_role(db, user, default_role)

    await db.commit()
    return await get_user_by_id(db, user.id)  # type: ignore[return-value]


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User:
    user = await get_user_by_email(db, email)
    if user is None or not verify_password(password, user.password_hash):
        raise InvalidCredentialsError
    if not user.is_active:
        raise InactiveUserError

    user.last_login_at = datetime.now(UTC)
    await db.commit()
    return user


async def _persist_refresh_token(
    db: AsyncSession, user_id: uuid.UUID, replaces_id: uuid.UUID | None = None
) -> tuple[RefreshToken, str]:
    raw_token = generate_refresh_token()
    now = datetime.now(UTC)
    token = RefreshToken(
        user_id=user_id,
        token_hash=hash_refresh_token(raw_token),
        expires_at=now + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(token)
    await db.flush()

    if replaces_id is not None:
        old = await db.get(RefreshToken, replaces_id)
        if old is not None:
            old.revoked_at = now
            old.replaced_by_id = token.id

    return token, raw_token


async def issue_token_pair(db: AsyncSession, user: User) -> TokenResponse:
    access_token, expires_in = create_access_token(user.id)
    _, raw_refresh_token = await _persist_refresh_token(db, user.id)
    await db.commit()
    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh_token,
        expires_in=expires_in,
    )


async def _get_refresh_token_by_raw(db: AsyncSession, raw_token: str) -> RefreshToken | None:
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == hash_refresh_token(raw_token))
    )
    return result.scalar_one_or_none()


async def _issue_token_pair_from(db: AsyncSession, current: RefreshToken) -> TokenResponse:
    user = await get_user_by_id(db, current.user_id)
    if user is None or not user.is_active:
        raise InvalidRefreshTokenError

    access_token, expires_in = create_access_token(user.id)
    _, raw_refresh_token = await _persist_refresh_token(db, user.id, replaces_id=current.id)
    await db.commit()
    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh_token,
        expires_in=expires_in,
    )


async def rotate_refresh_token(db: AsyncSession, raw_token: str) -> TokenResponse:
    token = await _get_refresh_token_by_raw(db, raw_token)
    if token is None:
        raise InvalidRefreshTokenError

    now = datetime.now(UTC)

    if token.revoked_at is not None:
        grace_seconds = settings.refresh_token_reuse_grace_seconds
        grace_cutoff = token.revoked_at + timedelta(seconds=grace_seconds)
        if token.replaced_by_id is not None and now <= grace_cutoff:
            replacement = await db.get(RefreshToken, token.replaced_by_id)
            if replacement is not None and replacement.revoked_at is None:
                # token was rotated out moments ago and nothing has used
                # its replacement yet -- this is the losing side of a
                # same-token race, not reuse. Fast-forward onto the
                # chain's current tip instead of nuking the session.
                return await _issue_token_pair_from(db, replacement)

        # Either outside the grace window or the replacement has itself
        # already moved on (someone has used this chain since the race
        # window would have applied) -- this is genuine reuse of an
        # already-rotated token. Treat the whole chain as compromised and
        # revoke every active token for this user.
        result = await db.execute(
            select(RefreshToken).where(
                RefreshToken.user_id == token.user_id, RefreshToken.revoked_at.is_(None)
            )
        )
        for active_token in result.scalars():
            active_token.revoked_at = now
        await db.commit()
        raise RevokedRefreshTokenError

    if token.expires_at < now:
        raise InvalidRefreshTokenError

    return await _issue_token_pair_from(db, token)


async def revoke_refresh_token(db: AsyncSession, raw_token: str) -> None:
    token = await _get_refresh_token_by_raw(db, raw_token)
    if token is None or token.revoked_at is not None:
        return
    token.revoked_at = datetime.now(UTC)
    await db.commit()
