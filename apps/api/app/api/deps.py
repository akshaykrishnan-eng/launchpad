import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.roles import RoleName
from app.core.security import InvalidTokenError, decode_access_token
from app.db.session import get_db
from app.models.candidate_profile import CandidateProfile
from app.models.user import User
from app.services.auth import get_user_by_id, user_role_names
from app.services.candidate_profile import get_or_create_profile

_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )

    try:
        payload = decode_access_token(credentials.credentials)
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired access token"
        ) from exc

    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired access token"
        ) from exc

    # Roles are re-read from the database rather than trusted from the
    # token, so a role change or deactivation takes effect immediately
    # instead of waiting for the access token to expire.
    user = await get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired access token"
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")

    return user


def require_role(*allowed_roles: RoleName):
    allowed = {role.value for role in allowed_roles}

    def _dependency(current_user: User = Depends(get_current_user)) -> User:
        if allowed.isdisjoint(user_role_names(current_user)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return current_user

    return _dependency


async def get_current_candidate_profile(
    current_user: User = Depends(require_role(RoleName.CANDIDATE)),
    db: AsyncSession = Depends(get_db),
) -> CandidateProfile:
    """The profile is always derived from the authenticated user's id,
    never from a client-supplied id -- this is the ownership boundary
    every candidate endpoint is built on."""
    return await get_or_create_profile(db, current_user.id)


# ADMIN and SUPER_ADMIN are treated identically in this phase (PRD
# section 29: "do not build a complicated permissions matrix unless
# required"). Every admin route depends on this, never on a
# client-supplied role/id -- the role is always re-read from the
# database by get_current_user above.
require_admin = require_role(RoleName.ADMIN, RoleName.SUPER_ADMIN)
