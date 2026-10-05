import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.candidate_skill import CandidateSkill
    from app.models.career_preference import CareerPreference
    from app.models.education import Education
    from app.models.user import User
    from app.models.work_experience import WorkExperience


class CandidateProfile(Base):
    """The candidate's identity record. One per User -- never duplicates
    email/password/auth data, which stays owned by User (Phase 2)."""

    __tablename__ = "candidate_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )

    first_name: Mapped[str | None] = mapped_column(String(100))
    last_name: Mapped[str | None] = mapped_column(String(100))
    mobile_number: Mapped[str | None] = mapped_column(String(20))
    current_city: Mapped[str | None] = mapped_column(String(100))
    # Plain string, not a Postgres enum: a new status value later is a
    # Python-side change only, never an ALTER TYPE migration. Validated
    # against CandidateStatus at the API boundary (app/schemas/candidate.py).
    current_status: Mapped[str | None] = mapped_column(String(50))

    degree: Mapped[str | None] = mapped_column(String(150))
    specialisation: Mapped[str | None] = mapped_column(String(150))
    graduation_year: Mapped[int | None] = mapped_column(Integer)

    career_goal: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship()
    education_entries: Mapped[list["Education"]] = relationship(
        back_populates="candidate_profile", cascade="all, delete-orphan"
    )
    work_experiences: Mapped[list["WorkExperience"]] = relationship(
        back_populates="candidate_profile", cascade="all, delete-orphan"
    )
    candidate_skills: Mapped[list["CandidateSkill"]] = relationship(
        back_populates="candidate_profile", cascade="all, delete-orphan"
    )
    career_preference: Mapped["CareerPreference | None"] = relationship(
        back_populates="candidate_profile", cascade="all, delete-orphan", uselist=False
    )
