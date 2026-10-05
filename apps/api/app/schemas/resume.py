import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ResumeRead(BaseModel):
    """Deliberately a single schema for both the list and single-item
    responses: there's no field that differs between them yet, and a
    separate ResumeSummary/ResumeDetail pair would just duplicate this
    until one actually needs more data than the other.

    Never includes storage_key or any filesystem detail."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    version: int
    original_filename: str
    content_type: str
    file_size: int
    status: str
    uploaded_at: datetime
    is_latest: bool


class ReviewResultRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    score: int | None
    summary: str
    strengths: list[str]
    improvements: list[str]
    recommendations: list[str]
    reviewer_type: str
    created_at: datetime


class ReviewRequestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    resume_id: uuid.UUID
    status: str
    requested_at: datetime
    started_at: datetime | None
    completed_at: datetime | None
    result: ReviewResultRead | None
