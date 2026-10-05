import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.candidate_profile import CandidateProfile
    from app.models.review_request import ReviewRequest


class Resume(Base):
    """A candidate may have multiple versions; none are ever
    overwritten. `storage_key` is a server-generated, opaque reference
    into ResumeStorage -- never the original filename, never exposed
    through the API (see app/schemas/resume.py)."""

    __tablename__ = "resumes"
    __table_args__ = (
        UniqueConstraint("candidate_profile_id", "version", name="uq_resume_candidate_version"),
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
    version: Mapped[int] = mapped_column(Integer, nullable=False)

    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False)
    content_type: Mapped[str] = mapped_column(String(150), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)

    # Plain string (see app/core/candidate.py precedent), validated
    # against ResumeStatus at the API/service boundary.
    status: Mapped[str] = mapped_column(String(50), nullable=False)

    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    candidate_profile: Mapped["CandidateProfile"] = relationship()
    review_requests: Mapped[list["ReviewRequest"]] = relationship(
        back_populates="resume", cascade="all, delete-orphan"
    )
