import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.candidate_profile import CandidateProfile


class CreditTransaction(Base):
    """The ledger is the source of truth -- a candidate's balance for a
    credit_type is always SUM(amount) over their rows here, never a
    mutable counter (see app/services/credits.py:get_balance).

    reference_type/reference_id point at whatever caused this entry
    (e.g. "MOCK_INTERVIEW" / a MockInterview id) without an FK, since a
    generic ledger shouldn't hard-FK to every possible reference table
    it might ever point at. MockInterview itself does hold a real FK
    back to the exact debit row it was created with -- see
    MockInterview.credit_transaction_id -- which is the actual
    double-debit guard; this column is for display/traceability only."""

    __tablename__ = "credit_transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    candidate_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    credit_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # Positive = credit added, negative = credit consumed. Never zero
    # (enforced at the service layer, not the database).
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(String(50), nullable=False)
    reference_type: Mapped[str | None] = mapped_column(String(50))
    reference_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    description: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    candidate_profile: Mapped["CandidateProfile"] = relationship()
