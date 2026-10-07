import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.event import EventStatus, EventType


class EventRead(BaseModel):
    """Candidate-safe projection of an Event: no internal/admin-only
    fields. status here is the *effective* status (DRAFT never
    reaches a candidate; see app/services/event.py:list_candidate_events),
    with COMPLETED derived from ends_at rather than stored."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str
    event_type: EventType
    status: EventStatus
    starts_at: datetime
    ends_at: datetime
    timezone: str
    location: str | None
    meeting_url: str | None
    is_registered: bool = False


class EventRegisterResponse(BaseModel):
    event_id: uuid.UUID
    registered: bool = True
    registered_at: datetime


class CreateEventRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    event_type: EventType
    starts_at: datetime
    ends_at: datetime
    timezone: str = Field(min_length=1, max_length=64)
    location: str | None = Field(default=None, max_length=255)
    meeting_url: str | None = Field(default=None, max_length=2048)
    status: EventStatus = EventStatus.DRAFT

    @field_validator("meeting_url")
    @classmethod
    def _validate_meeting_url(cls, value: str | None) -> str | None:
        if value is None or value == "":
            return None
        if not (value.startswith("http://") or value.startswith("https://")):
            raise ValueError("meeting_url must be a valid http(s) URL")
        return value

    @model_validator(mode="after")
    def _validate_dates(self) -> "CreateEventRequest":
        if self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be after starts_at")
        return self


class UpdateEventRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1)
    event_type: EventType | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    timezone: str | None = Field(default=None, min_length=1, max_length=64)
    location: str | None = Field(default=None, max_length=255)
    meeting_url: str | None = Field(default=None, max_length=2048)

    @field_validator("meeting_url")
    @classmethod
    def _validate_meeting_url(cls, value: str | None) -> str | None:
        if value is None or value == "":
            return None
        if not (value.startswith("http://") or value.startswith("https://")):
            raise ValueError("meeting_url must be a valid http(s) URL")
        return value
