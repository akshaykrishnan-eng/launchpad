import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, computed_field

from app.core.notification import NotificationType


class NotificationRead(BaseModel):
    """Candidate-safe projection of a Notification: no internal
    recipient_user_id. is_read is derived from read_at rather than
    exposing the raw timestamp/null distinction to the client."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: NotificationType
    title: str
    message: str
    event_id: uuid.UUID | None
    read_at: datetime | None
    created_at: datetime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def is_read(self) -> bool:
        return self.read_at is not None


class UnreadCountRead(BaseModel):
    unread_count: int


class MarkAllReadResponse(BaseModel):
    marked_read: int
