from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.roles import RoleName
from app.models.role import Role
from app.models.user import User
from app.models.user_role import UserRole


async def seed_roles(db: AsyncSession) -> None:
    """Idempotently ensures the fixed set of system roles exists.
    Safe to run every time the app starts: ON CONFLICT DO NOTHING means
    re-running never duplicates a role."""
    stmt = insert(Role).values([{"name": role.value} for role in RoleName])
    stmt = stmt.on_conflict_do_nothing(index_elements=[Role.name])
    await db.execute(stmt)
    await db.commit()


async def get_role_by_name(db: AsyncSession, name: RoleName) -> Role | None:
    result = await db.execute(select(Role).where(Role.name == name.value))
    return result.scalar_one_or_none()


async def assign_role(db: AsyncSession, user: User, role: Role) -> None:
    db.add(UserRole(user_id=user.id, role_id=role.id))
    await db.flush()
