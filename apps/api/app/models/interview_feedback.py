import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ARRAY, CheckConstraint, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.mock_interview import MockInterview


class InterviewFeedback(Base):
    """One row per completed MockInterview. Not exposed through any
    candidate endpoint for creation -- same "no reviewer portal yet"
    approach as ReviewResult/LinkedInReviewResult: written through
    app/services/mock_interview.py:complete_interview directly (e.g. by
    a future interviewer tool, or manually for verification), never
    fabricated by the API itself.

    Per-area scores are 0-10, overall_score is 0-100 -- matching the
    PRD's UX copy ("Overall Score 82 / 100", "Communication 8 / 10").
    Enforced both here (CHECK) and at the Pydantic schema boundary."""

    __tablename__ = "interview_feedback"

    __table_args__ = (
        CheckConstraint(
            "communication_score BETWEEN 0 AND 10", name="ck_feedback_communication_range"
        ),
        CheckConstraint("confidence_score BETWEEN 0 AND 10", name="ck_feedback_confidence_range"),
        CheckConstraint("technical_score BETWEEN 0 AND 10", name="ck_feedback_technical_range"),
        CheckConstraint(
            "answer_structure_score BETWEEN 0 AND 10", name="ck_feedback_answer_structure_range"
        ),
        CheckConstraint(
            "professional_presentation_score BETWEEN 0 AND 10",
            name="ck_feedback_professional_presentation_range",
        ),
        CheckConstraint("overall_score BETWEEN 0 AND 100", name="ck_feedback_overall_range"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    mock_interview_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mock_interviews.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    communication_score: Mapped[int] = mapped_column(Integer, nullable=False)
    confidence_score: Mapped[int] = mapped_column(Integer, nullable=False)
    technical_score: Mapped[int] = mapped_column(Integer, nullable=False)
    answer_structure_score: Mapped[int] = mapped_column(Integer, nullable=False)
    professional_presentation_score: Mapped[int] = mapped_column(Integer, nullable=False)
    overall_score: Mapped[int] = mapped_column(Integer, nullable=False)

    feedback: Mapped[str] = mapped_column(Text, nullable=False)
    recommendations: Mapped[list[str]] = mapped_column(
        ARRAY(Text), default=list, server_default="{}"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    mock_interview: Mapped["MockInterview"] = relationship(back_populates="feedback")
