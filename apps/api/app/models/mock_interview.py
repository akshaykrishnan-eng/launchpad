import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.candidate_profile import CandidateProfile
    from app.models.credit_transaction import CreditTransaction
    from app.models.interview_feedback import InterviewFeedback
    from app.models.interview_slot import InterviewSlot


class MockInterview(Base):
    """A candidate's booking of one InterviewSlot. interview_type and
    scheduled_at are snapshotted from the slot at booking time (same
    "snapshot, don't version the parent" philosophy as
    LinkedInReviewRequest.profile_url_snapshot) so this row's meaning
    never shifts under a slot that -- in a future phase -- might become
    editable.

    credit_transaction_id is the actual double-debit guard: it's a
    unique FK set once, inside the same atomic transaction that creates
    this row (see app/services/mock_interview.py:book_interview), so a
    MockInterview can never exist without exactly one debit, and that
    debit can never be reused by a second MockInterview."""

    __tablename__ = "mock_interviews"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    candidate_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    slot_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("interview_slots.id", ondelete="RESTRICT"),
        unique=True,
        nullable=False,
    )
    credit_transaction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("credit_transactions.id", ondelete="RESTRICT"),
        unique=True,
        nullable=False,
    )

    interview_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # Only meaningful (and required by the service layer) when
    # interview_type == ROLE_SPECIFIC.
    role: Mapped[str | None] = mapped_column(String(150))
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    candidate_profile: Mapped["CandidateProfile"] = relationship()
    slot: Mapped["InterviewSlot"] = relationship(back_populates="mock_interview")
    credit_transaction: Mapped["CreditTransaction"] = relationship()
    feedback: Mapped["InterviewFeedback | None"] = relationship(
        back_populates="mock_interview", cascade="all, delete-orphan", uselist=False
    )
