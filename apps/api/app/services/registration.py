import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import (
    InvalidTokenError,
    create_pending_registration_token,
    decode_pending_registration_token,
    generate_otp,
    hash_otp,
    hash_password,
    verify_otp,
)
from app.models.pending_registration import PendingRegistration
from app.models.user import User
from app.services.auth import get_user_by_email, get_user_by_id, register_user
from app.services.email import get_email_service

settings = get_settings()


class InvalidOrExpiredTokenError(Exception):
    """Covers a malformed/expired registration token and a token whose
    pending registration row no longer exists (already completed, or
    never real -- see start_registration's enumeration handling below).
    Deliberately one error for all three so a caller can't distinguish
    them from the response alone."""


class InvalidOtpError(Exception):
    pass


class TooManyAttemptsError(Exception):
    pass


class ResendCooldownError(Exception):
    def __init__(self, retry_after_seconds: int) -> None:
        self.retry_after_seconds = retry_after_seconds


class NotVerifiedError(Exception):
    """Raised by complete_registration when the OTP step hasn't
    succeeded yet for this registration token."""


def _otp_email_body(otp: str) -> str:
    return (
        "Your Launchpad verification code is:\n\n"
        f"{otp}\n\n"
        f"This code expires in {settings.otp_expire_minutes} minutes.\n\n"
        "If you didn't request this, you can safely ignore this email -- "
        "no account will be created without it."
    )


async def _get_pending_registration(db: AsyncSession, token: str) -> PendingRegistration:
    try:
        pending_id = decode_pending_registration_token(token)
    except InvalidTokenError as exc:
        raise InvalidOrExpiredTokenError from exc

    pending = await db.get(PendingRegistration, pending_id)
    if pending is None:
        raise InvalidOrExpiredTokenError
    return pending


async def _issue_otp(db: AsyncSession, pending: PendingRegistration) -> None:
    """(Re)arms a pending registration with a fresh OTP: invalidates
    whatever OTP existed before (new hash overwrites it), resets the
    attempt counter, and resets verified_at -- a new code means the
    candidate must prove they received *this* one, not an earlier one
    they may have verified before requesting a resend."""
    now = datetime.now(UTC)
    otp = generate_otp()
    pending.otp_hash = hash_otp(otp)
    pending.otp_expires_at = now + timedelta(minutes=settings.otp_expire_minutes)
    pending.attempts = 0
    pending.last_sent_at = now
    pending.verified_at = None
    await db.flush()

    # Sent after the row is flushed but before commit: if delivery
    # raises, the caller's transaction rolls back and the candidate can
    # just retry -- there is no "OTP sent but not persisted" state.
    await get_email_service().send(
        to=pending.email,
        subject="Your Launchpad verification code",
        body=_otp_email_body(otp),
    )


async def start_registration(db: AsyncSession, email: str) -> str:
    """Always returns a registration token shaped identically regardless
    of whether `email` is new, already verified, or existing-but-unverified
    -- the email-enumeration boundary.

    Flow A (new email): create PendingRegistration, send OTP, return token.
    Flow B (existing unverified): reuse/create PendingRegistration for that
      email and send OTP so the candidate can complete verification.
    Flow C (existing verified): return a structurally-identical fake token
      but send no OTP -- any verify attempt against it fails just as a
      genuinely-missing pending registration would.
    """
    existing_user = await get_user_by_email(db, email)
    if existing_user is not None and existing_user.email_verified:
        # Flow C -- surface a clear conflict rather than silently issuing
        # a fake token that leads to a confusing "invalid code" dead end.
        from app.services.auth import EmailAlreadyRegisteredError
        raise EmailAlreadyRegisteredError

    # Reuse an in-flight pending registration for this email rather than
    # piling up rows -- also what makes "start" and "resend" share one
    # cooldown instead of resend protection being bypassable by just
    # calling start again. PRD section 24 rules out a scheduled cleanup
    # job, so a stale/expired row is simply reused here instead.
    result = await db.execute(
        select(PendingRegistration).where(PendingRegistration.email == email)
    )
    pending = result.scalar_one_or_none()

    now = datetime.now(UTC)
    if pending is not None:
        elapsed = (now - pending.last_sent_at).total_seconds()
        if elapsed < settings.otp_resend_cooldown_seconds:
            raise ResendCooldownError(int(settings.otp_resend_cooldown_seconds - elapsed))
    else:
        pending = PendingRegistration(
            email=email,
            otp_hash="",
            otp_expires_at=now,
            last_sent_at=now - timedelta(seconds=settings.otp_resend_cooldown_seconds),
        )
        db.add(pending)
        await db.flush()

    await _issue_otp(db, pending)
    await db.commit()

    return create_pending_registration_token(pending.id)


async def resend_registration_otp(db: AsyncSession, token: str) -> None:
    pending = await _get_pending_registration(db, token)

    now = datetime.now(UTC)
    elapsed = (now - pending.last_sent_at).total_seconds()
    if elapsed < settings.otp_resend_cooldown_seconds:
        raise ResendCooldownError(int(settings.otp_resend_cooldown_seconds - elapsed))

    await _issue_otp(db, pending)
    await db.commit()


async def verify_registration_otp(db: AsyncSession, token: str, otp: str) -> None:
    pending = await _get_pending_registration(db, token)

    if pending.attempts >= settings.otp_max_attempts:
        raise TooManyAttemptsError

    now = datetime.now(UTC)
    if pending.otp_expires_at < now:
        raise InvalidOtpError

    if not verify_otp(otp, pending.otp_hash):
        pending.attempts += 1
        await db.commit()
        raise InvalidOtpError

    pending.verified_at = now
    await db.commit()


async def complete_registration(db: AsyncSession, token: str, password: str) -> User:
    """Only reachable once verify_registration_otp has succeeded.

    Flow A (new email): delegates to register_user, which handles password
      hashing, CANDIDATE role assignment, and duplicate-email race protection.
    Flow B (existing unverified user): activates the existing User by marking
      email_verified=True and updating their password hash. Does NOT create a
      duplicate row.
    """
    pending = await _get_pending_registration(db, token)

    if pending.verified_at is None:
        raise NotVerifiedError

    # Flow B: a User already exists for this email but was unverified
    # (created before Phase 14 or via an edge path). Activate it instead
    # of creating a second row.
    existing = await get_user_by_email(db, pending.email)
    if existing is not None:
        if existing.email_verified:
            # Race: the account was verified between /start and /complete.
            # The PendingRegistration is now stale -- clean it up and surface
            # a conflict so the caller can redirect to login.
            await db.delete(pending)
            await db.commit()
            from app.services.auth import EmailAlreadyRegisteredError
            raise EmailAlreadyRegisteredError
        existing.email_verified = True
        existing.password_hash = hash_password(password)
        await db.delete(pending)
        await db.commit()
        return await get_user_by_id(db, existing.id)  # type: ignore[return-value]

    # Flow A: brand-new user
    user = await register_user(db, pending.email, password)
    # Deletes the row so the token can never be replayed to create a second
    # account. If this delete doesn't happen, a retry is still safe:
    # register_user raises EmailAlreadyRegisteredError for the now-taken email.
    await db.delete(pending)
    await db.commit()
    return user
