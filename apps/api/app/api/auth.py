from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserPublic,
)
from app.schemas.registration import (
    RegisterCompleteRequest,
    RegisterResendRequest,
    RegisterStartRequest,
    RegisterVerifyRequest,
    RegistrationTokenResponse,
)
from app.services import auth as auth_service
from app.services import registration as registration_service

router = APIRouter(prefix="/auth", tags=["auth"])

# Deliberately identical for every failure mode of the verify/resend
# step (bad token, expired/wrong OTP) so a client can't tell a real
# pending registration with a wrong code apart from a token that was
# never real to begin with -- see registration_service.start_registration.
_GENERIC_VERIFICATION_ERROR = "Invalid or expired verification code"


def _to_user_public(user: User) -> UserPublic:
    return UserPublic(
        id=user.id,
        email=user.email,
        roles=auth_service.user_role_names(user),
        is_active=user.is_active,
    )


@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)) -> UserPublic:
    try:
        user = await auth_service.register_user(db, payload.email, payload.password)
    except auth_service.EmailAlreadyRegisteredError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email is already registered"
        ) from exc
    return _to_user_public(user)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    try:
        user = await auth_service.authenticate_user(db, payload.email, payload.password)
    except (auth_service.InvalidCredentialsError, auth_service.InactiveUserError) as exc:
        # Deliberately the same status/message for both: revealing which
        # one occurred would let an attacker enumerate registered emails.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        ) from exc
    except auth_service.EmailNotVerifiedError as exc:
        # Distinct from InvalidCredentials so the frontend can route the
        # candidate to the email-verification flow rather than a generic
        # "wrong password" message.  The code field is machine-readable.
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "email_not_verified", "message": "Email address has not been verified"},
        ) from exc
    return await auth_service.issue_token_pair(db, user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    try:
        return await auth_service.rotate_refresh_token(db, payload.refresh_token)
    except auth_service.RevokedRefreshTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked",
        ) from exc
    except auth_service.InvalidRefreshTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        ) from exc


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(payload: LogoutRequest, db: AsyncSession = Depends(get_db)) -> None:
    await auth_service.revoke_refresh_token(db, payload.refresh_token)


@router.get("/me", response_model=UserPublic)
async def me(current_user: User = Depends(get_current_user)) -> UserPublic:
    return _to_user_public(current_user)


# --- Email-verified registration (Phase 14) ---
#
# Candidate
#     v
# /register/start   -- creates a pending registration, sends an OTP
#     v
# /register/verify  -- proves ownership of the email
#     v
# /register/complete -- only now is a User actually created
#
# No User row exists before /complete succeeds. The legacy /register
# above remains for existing internal/test callers (see PROJECT_STATUS.md
# Phase 14) but the candidate-facing frontend now uses this flow.


@router.post("/register/start", response_model=RegistrationTokenResponse)
async def register_start(
    payload: RegisterStartRequest, db: AsyncSession = Depends(get_db)
) -> RegistrationTokenResponse:
    try:
        token = await registration_service.start_registration(db, payload.email)
    except auth_service.EmailAlreadyRegisteredError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email is already registered"
        ) from exc
    except registration_service.ResendCooldownError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {exc.retry_after_seconds}s before requesting another code",
        ) from exc
    return RegistrationTokenResponse(registration_token=token)


@router.post("/register/resend", status_code=status.HTTP_204_NO_CONTENT)
async def register_resend(
    payload: RegisterResendRequest, db: AsyncSession = Depends(get_db)
) -> None:
    try:
        await registration_service.resend_registration_otp(db, payload.registration_token)
    except registration_service.InvalidOrExpiredTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=_GENERIC_VERIFICATION_ERROR
        ) from exc
    except registration_service.ResendCooldownError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {exc.retry_after_seconds}s before requesting another code",
        ) from exc


@router.post("/register/verify", status_code=status.HTTP_204_NO_CONTENT)
async def register_verify(
    payload: RegisterVerifyRequest, db: AsyncSession = Depends(get_db)
) -> None:
    try:
        await registration_service.verify_registration_otp(
            db, payload.registration_token, payload.otp
        )
    except (
        registration_service.InvalidOrExpiredTokenError,
        registration_service.InvalidOtpError,
    ) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=_GENERIC_VERIFICATION_ERROR
        ) from exc
    except registration_service.TooManyAttemptsError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many incorrect attempts. Please request a new code.",
        ) from exc


@router.post(
    "/register/complete", response_model=UserPublic, status_code=status.HTTP_201_CREATED
)
async def register_complete(
    payload: RegisterCompleteRequest, db: AsyncSession = Depends(get_db)
) -> UserPublic:
    try:
        user = await registration_service.complete_registration(
            db, payload.registration_token, payload.password
        )
    except registration_service.InvalidOrExpiredTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=_GENERIC_VERIFICATION_ERROR
        ) from exc
    except registration_service.NotVerifiedError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email has not been verified yet"
        ) from exc
    except auth_service.EmailAlreadyRegisteredError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email is already registered"
        ) from exc
    return _to_user_public(user)
