import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ARRAY, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.linkedin_review_request import LinkedInReviewRequest


class LinkedInReviewResult(Base):
    """Mirrors app/models/review_result.py exactly (same field shape),
    kept as its own table rather than shared because it FKs to
    linkedin_review_requests.id, not review_requests.id -- the same
    "twin, not shared" reasoning as LinkedInReviewRequest. Still
    provider-agnostic: reviewer_type supports HUMAN/AI/HYBRID even
    though this phase only ever writes HUMAN results, manually."""

    __tablename__ = "linkedin_review_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    review_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("linkedin_review_requests.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )

    score: Mapped[int | None] = mapped_column(Integer)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    strengths: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list, server_default="{}")
    improvements: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list, server_default="{}")
    recommendations: Mapped[list[str]] = mapped_column(
        ARRAY(Text), default=list, server_default="{}"
    )
    reviewer_type: Mapped[str] = mapped_column(String(50), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    review_request: Mapped["LinkedInReviewRequest"] = relationship(back_populates="result")
