import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ARRAY, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.candidate_profile import CandidateProfile


class CareerPreference(Base):
    """One row per candidate. Preferred roles/locations are free-text
    arrays rather than a fixed catalog table: the brief is explicit that
    the example roles (Software Developer, DevOps Engineer, ...) must
    not be hardcoded as the only allowed values, and a dedicated
    normalized Role/Location catalog is more structure than this phase
    needs -- that can be introduced later if job matching requires it."""

    __tablename__ = "career_preferences"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    candidate_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    preferred_roles: Mapped[list[str]] = mapped_column(
        ARRAY(String(100)), default=list, server_default="{}", nullable=False
    )
    preferred_locations: Mapped[list[str]] = mapped_column(
        ARRAY(String(100)), default=list, server_default="{}", nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    candidate_profile: Mapped["CandidateProfile"] = relationship(
        back_populates="career_preference"
    )
