import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.candidate_profile import CandidateProfile
    from app.models.linkedin_review_request import LinkedInReviewRequest


class LinkedInProfile(Base):
    """One per candidate (not versioned -- see app/services/linkedin.py
    and the README's LinkedIn Centre section for why review history
    stays correct across URL edits without needing to version this
    row). Updating `profile_url` in place is the whole point: there is
    exactly one "current" LinkedIn URL per candidate."""

    __tablename__ = "linkedin_profiles"

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
    profile_url: Mapped[str] = mapped_column(String(500), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    candidate_profile: Mapped["CandidateProfile"] = relationship()
    review_requests: Mapped[list["LinkedInReviewRequest"]] = relationship(
        back_populates="linkedin_profile", cascade="all, delete-orphan"
    )
