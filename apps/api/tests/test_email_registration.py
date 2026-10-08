from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import decode_access_token, decode_pending_registration_token
from app.db.session import AsyncSessionLocal
from app.models.pending_registration import PendingRegistration
from app.models.refresh_token import RefreshToken
from app.models.user import User
from tests.helpers import (
    DEFAULT_PASSWORD,
    auth_headers,
    complete_registration,
    extract_otp,
    login,
    register_and_verify_email,
    resend_registration,
    start_registration,
    verify_registration,
)

settings = get_settings()


# --- Starting a registration ---


def test_start_registration_returns_a_registration_token(
    client: TestClient, email_service
) -> None:
    response = start_registration(client, "start.basic@example.com")

    assert response.status_code == 200
    assert isinstance(response.json()["registration_token"], str)


def test_start_registration_sends_otp_through_email_service(
    client: TestClient, email_service
) -> None:
    start_registration(client, "start.sends@example.com")

    assert len(email_service.sent) == 1
    assert email_service.sent[0]["to"] == "start.sends@example.com"


async def test_start_registration_creates_pending_registration_row(
    client: TestClient, email_service
) -> None:
    start_registration(client, "start.row@example.com")

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(PendingRegistration).where(PendingRegistration.email == "start.row@example.com")
        )
        pending = result.scalar_one()

    assert pending.verified_at is None
    assert pending.attempts == 0


async def test_otp_is_not_stored_in_plaintext(client: TestClient, email_service) -> None:
    start_registration(client, "start.hash@example.com")
    otp = extract_otp(email_service.sent[0]["body"])

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(PendingRegistration).where(PendingRegistration.email == "start.hash@example.com")
        )
        pending = result.scalar_one()

    assert otp not in pending.otp_hash
    assert pending.otp_hash.startswith("$argon2")


async def test_final_user_is_not_created_before_verification(
    client: TestClient, email_service
) -> None:
    start_registration(client, "start.nouser@example.com")

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == "start.nouser@example.com"))
        user = result.scalar_one_or_none()

    assert user is None


# --- OTP verification ---


def test_correct_otp_verifies_successfully(client: TestClient, email_service) -> None:
    start_response = start_registration(client, "verify.correct@example.com")
    token = start_response.json()["registration_token"]
    otp = extract_otp(email_service.sent[0]["body"])

    response = verify_registration(client, token, otp)

    assert response.status_code == 204


def test_incorrect_otp_fails(client: TestClient, email_service) -> None:
    start_response = start_registration(client, "verify.wrong@example.com")
    token = start_response.json()["registration_token"]

    response = verify_registration(client, token, "000000")

    assert response.status_code == 401


def test_otp_expires_correctly(client: TestClient, email_service) -> None:
    start_response = start_registration(client, "verify.expired@example.com")
    token = start_response.json()["registration_token"]
    otp = extract_otp(email_service.sent[0]["body"])

    pending_id = decode_pending_registration_token(token)

    async def _expire() -> None:
        async with AsyncSessionLocal() as db:
            pending = await db.get(PendingRegistration, pending_id)
            pending.otp_expires_at = datetime.now(UTC) - timedelta(seconds=1)
            await db.commit()

    _run(_expire())

    response = verify_registration(client, token, otp)

    assert response.status_code == 401


def test_expired_otp_cannot_be_reused_after_a_fresh_one_is_issued(
    client: TestClient, email_service
) -> None:
    start_response = start_registration(client, "verify.stale@example.com")
    token = start_response.json()["registration_token"]
    old_otp = extract_otp(email_service.sent[0]["body"])

    pending_id = decode_pending_registration_token(token)

    async def _expire_and_let_resend_through() -> None:
        async with AsyncSessionLocal() as db:
            pending = await db.get(PendingRegistration, pending_id)
            pending.last_sent_at = datetime.now(UTC) - timedelta(
                seconds=settings.otp_resend_cooldown_seconds + 1
            )
            await db.commit()

    _run(_expire_and_let_resend_through())
    resend_registration(client, token)

    response = verify_registration(client, token, old_otp)

    assert response.status_code == 401


def test_more_than_max_attempts_is_rejected(client: TestClient, email_service) -> None:
    start_response = start_registration(client, "verify.bruteforce@example.com")
    token = start_response.json()["registration_token"]

    last_response = None
    for _ in range(settings.otp_max_attempts):
        last_response = verify_registration(client, token, "111111")
        assert last_response.status_code == 401

    response = verify_registration(client, token, "111111")

    assert response.status_code == 429


def test_new_otp_resets_attempts(client: TestClient, email_service) -> None:
    start_response = start_registration(client, "verify.reset@example.com")
    token = start_response.json()["registration_token"]

    for _ in range(settings.otp_max_attempts):
        verify_registration(client, token, "111111")
    assert verify_registration(client, token, "111111").status_code == 429

    async def _clear_cooldown() -> None:
        pending_id = decode_pending_registration_token(token)
        async with AsyncSessionLocal() as db:
            pending = await db.get(PendingRegistration, pending_id)
            pending.last_sent_at = datetime.now(UTC) - timedelta(
                seconds=settings.otp_resend_cooldown_seconds + 1
            )
            await db.commit()

    _run(_clear_cooldown())
    resend = resend_registration(client, token)
    assert resend.status_code == 204

    new_otp = extract_otp(email_service.sent[-1]["body"])
    response = verify_registration(client, token, new_otp)

    assert response.status_code == 204


# --- Resend ---


def test_resend_cooldown_blocks_immediate_resend(client: TestClient, email_service) -> None:
    start_response = start_registration(client, "resend.cooldown@example.com")
    token = start_response.json()["registration_token"]

    response = resend_registration(client, token)

    assert response.status_code == 429


def test_new_otp_invalidates_old_otp(client: TestClient, email_service) -> None:
    start_response = start_registration(client, "resend.invalidate@example.com")
    token = start_response.json()["registration_token"]
    old_otp = extract_otp(email_service.sent[0]["body"])

    async def _clear_cooldown() -> None:
        pending_id = decode_pending_registration_token(token)
        async with AsyncSessionLocal() as db:
            pending = await db.get(PendingRegistration, pending_id)
            pending.last_sent_at = datetime.now(UTC) - timedelta(
                seconds=settings.otp_resend_cooldown_seconds + 1
            )
            await db.commit()

    _run(_clear_cooldown())
    resend_registration(client, token)

    response = verify_registration(client, token, old_otp)

    assert response.status_code == 401


# --- Account creation / ownership boundary ---


def test_pending_registration_cannot_access_authenticated_apis(
    client: TestClient, email_service
) -> None:
    start_response = start_registration(client, "pending.noauth@example.com")
    token = start_response.json()["registration_token"]

    response = client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 401


def test_pending_registration_token_cannot_be_decoded_as_access_token(
    client: TestClient, email_service
) -> None:
    start_response = start_registration(client, "pending.notaccess@example.com")
    token = start_response.json()["registration_token"]

    try:
        decode_access_token(token)
        decoded_ok = True
    except Exception:
        decoded_ok = False

    assert decoded_ok is False


def test_complete_before_verification_is_rejected(client: TestClient, email_service) -> None:
    start_response = start_registration(client, "complete.unverified@example.com")
    token = start_response.json()["registration_token"]

    response = complete_registration(client, token)

    assert response.status_code == 409


def test_final_user_is_created_after_successful_verification_and_completion(
    client: TestClient, email_service
) -> None:
    token = register_and_verify_email(client, email_service, "complete.success@example.com")

    response = complete_registration(client, token)

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "complete.success@example.com"
    assert body["roles"] == ["CANDIDATE"]
    assert "password" not in body


async def test_password_is_hashed_using_existing_password_mechanism(
    client: TestClient, email_service
) -> None:
    token = register_and_verify_email(client, email_service, "complete.hashed@example.com")
    complete_registration(client, token)

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == "complete.hashed@example.com"))
        user = result.scalar_one()

    assert user.password_hash != DEFAULT_PASSWORD
    assert user.password_hash.startswith("$argon2")


def test_registration_token_cannot_be_reused_after_completion(
    client: TestClient, email_service
) -> None:
    token = register_and_verify_email(client, email_service, "complete.noreplay@example.com")
    complete_registration(client, token)

    response = complete_registration(client, token)

    assert response.status_code == 401


def test_candidate_login_works_after_successful_registration(
    client: TestClient, email_service
) -> None:
    token = register_and_verify_email(client, email_service, "complete.login@example.com")
    complete_registration(client, token)

    response = login(client, "complete.login@example.com")

    assert response.status_code == 200
    assert response.json()["access_token"]


async def test_failed_final_account_creation_does_not_leave_partial_state(
    client: TestClient, email_service
) -> None:
    email = "complete.race@example.com"
    token = register_and_verify_email(client, email_service, email)

    # Simulate the email having been taken by another request between
    # verification and completion.
    async with AsyncSessionLocal() as db:
        from app.core.security import hash_password

        db.add(User(email=email, password_hash=hash_password(DEFAULT_PASSWORD)))
        await db.commit()

    response = complete_registration(client, token)

    assert response.status_code == 409

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email))
        users = result.scalars().all()

    assert len(users) == 1


# --- Email enumeration / duplicate email ---


def test_start_registration_returns_409_for_already_registered_email(
    client: TestClient, email_service
) -> None:
    """Flow C: a verified account already exists.  /start now returns a
    clear 409 so the candidate sees 'Email is already registered' and is
    pointed to /login, rather than silently reaching an OTP screen they
    can never complete."""
    email = "existing.verified@example.com"
    token = register_and_verify_email(client, email_service, email)
    complete_registration(client, token)
    email_service.sent.clear()

    response = start_registration(client, email)

    assert response.status_code == 409
    assert "already registered" in response.json()["detail"].lower()
    # No OTP sent for an email that already has a confirmed account.
    assert len(email_service.sent) == 0


def test_start_registration_still_sends_otp_for_new_email(
    client: TestClient, email_service
) -> None:
    """Sanity-check: a genuinely new email still succeeds after the Flow C change."""
    response = start_registration(client, "brandnew.user@example.com")

    assert response.status_code == 200
    assert "registration_token" in response.json()
    assert len(email_service.sent) == 1


async def test_duplicate_email_cannot_create_two_accounts(
    client: TestClient, email_service
) -> None:
    """A second registration attempt for an already-confirmed email is
    blocked at /start with a 409, preventing any further progress through
    the flow and guaranteeing exactly one User row per email."""
    email = "duplicate.flow@example.com"
    token = register_and_verify_email(client, email_service, email)
    complete_registration(client, token)

    second_start = start_registration(client, email)

    assert second_start.status_code == 409

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email))
        users = result.scalars().all()

    assert len(users) == 1


# --- Candidate role / onboarding continuity ---


def test_candidate_role_is_correctly_assigned(client: TestClient, email_service) -> None:
    token = register_and_verify_email(client, email_service, "role.candidate@example.com")
    complete_registration(client, token)

    tokens = login(client, "role.candidate@example.com").json()
    response = client.get("/api/v1/auth/me", headers=auth_headers(tokens))

    assert response.json()["roles"] == ["CANDIDATE"]


# --- Secret hygiene ---


def test_otp_is_not_included_in_verify_error_response(client: TestClient, email_service) -> None:
    start_response = start_registration(client, "secrets.noleak@example.com")
    token = start_response.json()["registration_token"]
    otp = extract_otp(email_service.sent[0]["body"])

    response = verify_registration(client, token, "999999")

    assert otp not in response.text


# --- Existing auth regression (unaffected by this phase) ---


async def test_existing_refresh_token_behavior_still_works(
    client: TestClient, email_service
) -> None:
    token = register_and_verify_email(client, email_service, "regression.refresh@example.com")
    complete_registration(client, token)
    tokens = login(client, "regression.refresh@example.com").json()

    response = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    )

    assert response.status_code == 200

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(RefreshToken))
        assert len(result.scalars().all()) >= 1


def test_existing_rbac_behavior_still_works(client: TestClient, email_service) -> None:
    token = register_and_verify_email(client, email_service, "regression.rbac@example.com")
    complete_registration(client, token)
    tokens = login(client, "regression.rbac@example.com").json()

    response = client.get(
        "/api/v1/rbac-demo/admin-only", headers=auth_headers(tokens)
    )

    assert response.status_code == 403


# --- Flow B: existing account that is not yet email-verified ---


async def _create_unverified_user(email: str, password: str = DEFAULT_PASSWORD) -> None:
    """Creates a User row with email_verified=False, simulating an account
    that was created before Phase 14 or via another path without OTP
    verification. Used only in Flow B tests."""
    from app.core.security import hash_password as _hash
    from app.models.role import Role
    from app.models.user_role import UserRole

    async with AsyncSessionLocal() as db:
        user = User(email=email, password_hash=_hash(password), email_verified=False)
        db.add(user)
        await db.flush()
        role = (await db.execute(select(Role).where(Role.name == "CANDIDATE"))).scalar_one()
        db.add(UserRole(user_id=user.id, role_id=role.id))
        await db.commit()


def test_flow_b_start_registration_sends_otp_for_unverified_account(
    client: TestClient, email_service
) -> None:
    email = "flowb.start@example.com"
    _run(_create_unverified_user(email))

    response = start_registration(client, email)

    assert response.status_code == 200
    # Unlike a verified account (Flow C), an actual OTP email is sent.
    assert len(email_service.sent) == 1
    assert email_service.sent[0]["to"] == email


async def test_flow_b_complete_activates_existing_account(
    client: TestClient, email_service
) -> None:
    email = "flowb.complete@example.com"
    await _create_unverified_user(email)

    token = register_and_verify_email(client, email_service, email)
    response = complete_registration(client, token, password="new-password-456")

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == email
    assert body["roles"] == ["CANDIDATE"]

    # Must not have created a second User row
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email))
        users = result.scalars().all()
    assert len(users) == 1
    assert users[0].email_verified is True


def test_flow_b_login_works_after_activation(
    client: TestClient, email_service
) -> None:
    email = "flowb.login@example.com"
    new_password = "activated-password-789"
    _run(_create_unverified_user(email))

    token = register_and_verify_email(client, email_service, email)
    complete_registration(client, token, password=new_password)

    response = login(client, email, password=new_password)

    assert response.status_code == 200
    assert response.json()["access_token"]


def test_flow_b_start_returns_same_shape_as_new_registration(
    client: TestClient, email_service
) -> None:
    """email-enumeration boundary: the response is structurally identical
    for a new address vs. an existing-but-unverified address."""
    existing_email = "flowb.shape.existing@example.com"
    new_email = "flowb.shape.new@example.com"
    _run(_create_unverified_user(existing_email))

    existing_resp = start_registration(client, existing_email)
    new_resp = start_registration(client, new_email)

    assert existing_resp.status_code == new_resp.status_code == 200
    assert set(existing_resp.json().keys()) == set(new_resp.json().keys())


# --- Login blocking for unverified accounts ---


def test_login_blocked_for_unverified_account(
    client: TestClient, email_service
) -> None:
    email = "login.unverified@example.com"
    _run(_create_unverified_user(email))

    response = login(client, email)

    assert response.status_code == 403
    detail = response.json()["detail"]
    assert isinstance(detail, dict)
    assert detail["code"] == "email_not_verified"


def test_login_succeeds_after_flow_b_verification(
    client: TestClient, email_service
) -> None:
    email = "login.verified@example.com"
    new_password = "verified-login-password"
    _run(_create_unverified_user(email))

    # Complete Flow B
    token = register_and_verify_email(client, email_service, email)
    complete_registration(client, token, password=new_password)

    response = login(client, email, password=new_password)

    assert response.status_code == 200
    assert response.json()["access_token"]


def test_login_wrong_password_still_returns_401_not_403(
    client: TestClient, email_service
) -> None:
    """Ensures the unverified-account 403 path doesn't accidentally trigger
    for accounts with wrong credentials."""
    email = "login.wrongpass@example.com"
    _run(_create_unverified_user(email))

    # Wrong password for an unverified account → 401 (credentials check
    # runs before email_verified check so the error is indistinguishable
    # from an unknown email)
    response = login(client, email, password="wrong-password")

    assert response.status_code == 401


def _run(coro):
    """Runs a one-off coroutine from a sync test body. The suite's own
    async tests rely on pytest-asyncio's "auto" mode (see pyproject
    config), but a couple of these tests need to mutate DB state
    between two synchronous TestClient calls."""
    import asyncio

    asyncio.run(coro)
