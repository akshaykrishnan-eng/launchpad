from fastapi import APIRouter, Depends

from app.api.deps import require_role
from app.core.roles import RoleName
from app.models.user import User

router = APIRouter(prefix="/rbac-demo", tags=["rbac-demo"])


@router.get("/admin-only")
async def admin_only(
    current_user: User = Depends(require_role(RoleName.ADMIN, RoleName.SUPER_ADMIN)),
) -> dict[str, str]:
    """Minimal example proving the require_role() mechanism works end to
    end. No real admin functionality belongs here; later phases build
    actual admin features on top of this same dependency."""
    return {"message": f"Hello admin {current_user.email}"}
