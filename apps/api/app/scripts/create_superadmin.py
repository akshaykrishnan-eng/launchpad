"""One-off operator script: create or promote a SUPER_ADMIN user.

Run inside the api container via `make create-superadmin` (see Makefile).
Not an HTTP endpoint -- there is no self-service way to grant SUPER_ADMIN,
by design (see CLAUDE.md RBAC rules).
"""

import argparse
import asyncio

from app.core.roles import RoleName
from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.services.auth import get_user_by_email, user_role_names
from app.services.roles import assign_role, get_role_by_name, seed_roles


async def create_superadmin(email: str, password: str | None) -> None:
    async with AsyncSessionLocal() as db:
        await seed_roles(db)
        role = await get_role_by_name(db, RoleName.SUPER_ADMIN)
        if role is None:
            raise RuntimeError("SUPER_ADMIN role is not seeded")

        user = await get_user_by_email(db, email)

        if user is None:
            if not password:
                raise SystemExit("--password is required to create a new user")
            user = User(email=email, password_hash=hash_password(password))
            db.add(user)
            await db.flush()
            await assign_role(db, user, role)
            await db.commit()
            print(f"Created {email} and granted SUPER_ADMIN.")
            return

        if RoleName.SUPER_ADMIN.value in user_role_names(user):
            print(f"{email} already has SUPER_ADMIN.")
            return

        await assign_role(db, user, role)
        await db.commit()
        print(f"Granted SUPER_ADMIN to existing user {email}.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Create or promote a SUPER_ADMIN user.")
    parser.add_argument("--email", required=True)
    parser.add_argument(
        "--password", default=None, help="Required only when the user does not already exist"
    )
    args = parser.parse_args()
    asyncio.run(create_superadmin(args.email, args.password))


if __name__ == "__main__":
    main()
