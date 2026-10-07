import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.candidate_profile import CandidateProfile
    from app.models.event import Event


class EventRegistration(Base):
    """One candidate's registration for one event. The uq constraint
    below is the actual duplicate-registration guard -- the service
    layer's pre-check is just a fast path, not the source of truth."""

    __tablename__ = "event_registrations"
    __table_args__ = (
        UniqueConstraint("event_id", "candidate_profile_id", name="uq_event_registration"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), index=True, nullable=False
    )
    candidate_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    registered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    event: Mapped["Event"] = relationship(back_populates="registrations")
    # Pure ORM navigation over the FK, same pattern as
    # ReviewRequest.candidate_profile -- lets the admin registrations
    # list show candidate name/email without a manual join.
    candidate_profile: Mapped["CandidateProfile"] = relationship(viewonly=True)
