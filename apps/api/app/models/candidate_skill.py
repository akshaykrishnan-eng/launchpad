import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.candidate_profile import CandidateProfile
    from app.models.skill import Skill


class CandidateSkill(Base):
    """Join of CandidateProfile <-> Skill. Has its own id (rather than a
    bare composite-key association table) so the API can expose a single
    stable identifier for 'remove this skill from my profile'."""

    __tablename__ = "candidate_skills"
    __table_args__ = (
        UniqueConstraint("candidate_profile_id", "skill_id", name="uq_candidate_skill"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    candidate_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("skills.id", ondelete="CASCADE"), index=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    candidate_profile: Mapped["CandidateProfile"] = relationship(
        back_populates="candidate_skills"
    )
    skill: Mapped["Skill"] = relationship(back_populates="candidate_skills")
