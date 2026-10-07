import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.mock_interview import MockInterview
    from app.models.user import User


class InterviewSlot(Base):
    """A single bookable time window. No interviewer portal exists yet
    to create these through a UI (see Phase 7 scope); for now they're
    created through controlled service/test/seed setup, the same
    "manual until a provider exists" approach as Resume/LinkedIn review
    results."""

    __tablename__ = "interview_slots"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    interviewer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    interview_type: Mapped[str] = mapped_column(String(50), nullable=False)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    # OPEN -> BOOKED (set atomically alongside the MockInterview that
    # claims it -- see app/services/mock_interview.py:book_interview) or
    # OPEN -> CANCELLED. Never BOOKED -> OPEN in this phase: cancelling
    # a booking is out of scope (see PRD section 38).
    status: Mapped[str] = mapped_column(String(50), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    interviewer: Mapped["User | None"] = relationship()
    mock_interview: Mapped["MockInterview | None"] = relationship(
        back_populates="slot", uselist=False
    )
