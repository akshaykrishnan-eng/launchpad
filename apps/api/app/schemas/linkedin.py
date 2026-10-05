import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

from app.core.linkedin import InvalidLinkedInUrlError, normalize_linkedin_url


class LinkedInProfileUpdate(BaseModel):
    profile_url: str

    @field_validator("profile_url")
    @classmethod
    def validate_and_normalize(cls, value: str) -> str:
        try:
            return normalize_linkedin_url(value)
        except InvalidLinkedInUrlError as exc:
            raise ValueError(exc.message) from exc


class LinkedInProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    profile_url: str
    created_at: datetime
    updated_at: datetime


class LinkedInReviewResultRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    score: int | None
    summary: str
    strengths: list[str]
    improvements: list[str]
    recommendations: list[str]
    reviewer_type: str
    created_at: datetime


class LinkedInReviewRequestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: str
    profile_url_snapshot: str
    requested_at: datetime
    started_at: datetime | None
    completed_at: datetime | None
    result: LinkedInReviewResultRead | None
