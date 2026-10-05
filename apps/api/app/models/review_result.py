import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ARRAY, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.review_request import ReviewRequest


class ReviewResult(Base):
    """Provider-agnostic: nothing here is AI-specific. `reviewer_type`
    exists so a future AI or hybrid provider can populate this same
    model without a schema change, but Phase 5 itself only ever writes
    HUMAN results via a manual service call (no AI integration)."""

    __tablename__ = "review_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    review_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("review_requests.id", ondelete="CASCADE"),
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
    # Plain string, validated against ReviewerType at the service
    # boundary -- same rationale as ResumeStatus.
    reviewer_type: Mapped[str] = mapped_column(String(50), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    review_request: Mapped["ReviewRequest"] = relationship(back_populates="result")
