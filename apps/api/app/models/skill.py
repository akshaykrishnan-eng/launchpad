import uuid
from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.candidate_skill import CandidateSkill


class Skill(Base):
    """A normalized, shared catalog -- not a per-candidate free-text
    field -- so skills can later be searched/matched across candidates.
    Case-insensitive uniqueness is enforced by a functional index on
    lower(name) (see the migration), since two columns both named
    "Python" and "python" would defeat the point of normalizing."""

    __tablename__ = "skills"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # No `unique=True` here: a functional unique index on lower(name) is
    # added by hand in the migration instead, since that's the
    # constraint that actually matters (case-insensitive).
    name: Mapped[str] = mapped_column(String(100), nullable=False)

    candidate_skills: Mapped[list["CandidateSkill"]] = relationship(back_populates="skill")
