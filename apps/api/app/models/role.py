import uuid
from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user_role import UserRole


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # Plain unique string rather than a Postgres ENUM type: adding a new
    # role later is then just an INSERT, not an ALTER TYPE migration.
    name: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)

    user_roles: Mapped[list["UserRole"]] = relationship(back_populates="role")
