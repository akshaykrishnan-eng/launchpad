import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.linkedin_profile import LinkedInProfile
    from app.models.linkedin_review_result import LinkedInReviewResult


class LinkedInReviewRequest(Base):
    """Structurally mirrors app/models/review_request.py (Phase 5's
    resume ReviewRequest) rather than sharing its table: resume_id
    there is NOT NULL with its own dedicated partial-unique index, and
    retrofitting that into a polymorphic resume-or-linkedin subject
    would mean nullable FKs + a CHECK constraint + rewriting the index
    on a table real Phase 5 data already depends on, for no integrity
    benefit this twin table doesn't already get more simply.

    `profile_url_snapshot` is the key invariant from the brief: a
    review is forever about the URL it captures here at request time,
    never the LinkedInProfile's possibly-since-edited current URL --
    this is what makes the profile safe to update in place without
    versioning it."""

    __tablename__ = "linkedin_review_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    linkedin_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("linkedin_profiles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    # Denormalized, same rationale as ReviewRequest.candidate_profile_id:
    # ownership checked via one indexed column, no join required.
    candidate_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    profile_url_snapshot: Mapped[str] = mapped_column(String(500), nullable=False)

    status: Mapped[str] = mapped_column(String(50), nullable=False)

    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    linkedin_profile: Mapped["LinkedInProfile"] = relationship(back_populates="review_requests")
    result: Mapped["LinkedInReviewResult | None"] = relationship(
        back_populates="review_request", cascade="all, delete-orphan", uselist=False
    )
