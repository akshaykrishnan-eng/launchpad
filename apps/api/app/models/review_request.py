import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.candidate_profile import CandidateProfile
    from app.models.resume import Resume
    from app.models.review_result import ReviewResult


class ReviewRequest(Base):
    """One per review cycle for a resume. Only one *active* (non-
    COMPLETED) request per resume is allowed -- enforced by a partial
    unique index in the migration, not just application logic, so a
    race between two simultaneous "Request Review" clicks can't create
    two active requests."""

    __tablename__ = "review_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    resume_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resumes.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # Denormalized from resume.candidate_profile_id: lets ownership be
    # checked with a single indexed column rather than a join, and
    # protects against the resume's ownership ever being reassigned.
    candidate_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(String(50), nullable=False)

    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    resume: Mapped["Resume"] = relationship(back_populates="review_requests")
    result: Mapped["ReviewResult | None"] = relationship(
        back_populates="review_request", cascade="all, delete-orphan", uselist=False
    )
    # Added in Phase 8 for the admin review queue, which needs the
    # candidate's name/email alongside each request -- pure ORM
    # navigation over the FK that already existed, no schema change.
    candidate_profile: Mapped["CandidateProfile"] = relationship(viewonly=True)
