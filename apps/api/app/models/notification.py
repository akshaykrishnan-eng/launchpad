import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class Notification(Base):
    """One in-app notification for one User. Recipient is the existing
    User identity, never a duplicated candidate/admin notification
    table -- future email/push delivery reads from this same row
    rather than a parallel model (see app/services/notification.py).

    read_at NULL means unread; a timestamp means read. Notifications
    are never deleted on read."""

    __tablename__ = "notifications"
    __table_args__ = (
        # Ordered listing for one recipient (GET /candidate/notifications).
        Index("ix_notifications_recipient_created", "recipient_user_id", "created_at"),
        # Unread-count / unread-list lookups for one recipient.
        Index("ix_notifications_recipient_read_at", "recipient_user_id", "read_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    recipient_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)

    # Optional reference to the Event this notification is about (currently
    # only EVENT_PUBLISHED sets this). Nullable/generic rather than a new
    # model, so a future event-related notification type can reuse it; SET
    # NULL on event delete so the notification itself is never lost.
    event_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("events.id", ondelete="SET NULL"), nullable=True
    )

    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    recipient: Mapped["User"] = relationship(viewonly=True)
