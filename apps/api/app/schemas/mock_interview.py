import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class InterviewSlotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    interview_type: str
    starts_at: datetime
    ends_at: datetime


class InterviewFeedbackRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    communication_score: int
    confidence_score: int
    technical_score: int
    answer_structure_score: int
    professional_presentation_score: int
    overall_score: int
    feedback: str
    recommendations: list[str]
    created_at: datetime


class MockInterviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    interview_type: str
    role: str | None
    status: str
    scheduled_at: datetime
    created_at: datetime
    feedback: InterviewFeedbackRead | None = None


class BookInterviewRequest(BaseModel):
    slot_id: uuid.UUID
    # Required only when the slot's interview_type is ROLE_SPECIFIC;
    # checked in app/services/mock_interview.py (it needs the slot's
    # type, which isn't known from the request body alone).
    role: str | None = Field(default=None, max_length=150)
