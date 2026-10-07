import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.credits import CreditTransactionReason, CreditType
from app.core.event import EventStatus, EventType
from app.core.mock_interview import InterviewType
from app.schemas.candidate import (
    CandidateProfileRead,
    CandidateSkillRead,
    CareerPreferenceRead,
    EducationRead,
    WorkExperienceRead,
)
from app.schemas.credits import CreditBalanceRead, CreditTransactionRead
from app.schemas.linkedin import LinkedInProfileRead, LinkedInReviewRequestRead
from app.schemas.mock_interview import MockInterviewRead
from app.schemas.resume import ResumeRead, ReviewRequestRead


class Page[T](BaseModel):
    """One shared pagination envelope reused by every admin list
    endpoint, rather than a bespoke items/total/page/page_size shape
    repeated six times."""

    items: list[T]
    total: int
    page: int
    page_size: int


# --- Candidate identity -----------------------------------------------
#
# Deliberately its own small schema, never the User ORM object: exposes
# only what an admin needs (email, activity timestamps), never
# password_hash or anything token-related.


class AdminCandidateIdentity(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    email: str
    is_active: bool
    created_at: datetime
    last_login_at: datetime | None


class CandidateListItem(BaseModel):
    id: uuid.UUID
    email: str
    first_name: str | None
    last_name: str | None
    current_status: str | None
    completion_percentage: int
    created_at: datetime


class CandidateSummary(BaseModel):
    """The small candidate reference embedded in review/interview queue
    rows -- not the full identity/profile, just enough to display and
    link to Candidate 360."""

    id: uuid.UUID
    email: str
    first_name: str | None
    last_name: str | None


# --- Candidate 360 -------------------------------------------------------


class Candidate360Response(BaseModel):
    """Composed entirely from existing Read schemas (candidate/resume/
    linkedin/mock-interview/credits) -- see app/services/admin.py. Only
    AdminCandidateIdentity above is new, and it excludes every
    authentication secret by construction."""

    candidate: AdminCandidateIdentity
    profile: CandidateProfileRead
    education: list[EducationRead]
    skills: list[CandidateSkillRead]
    experience: list[WorkExperienceRead]
    career_preferences: CareerPreferenceRead
    resume: ResumeRead | None
    resume_review: ReviewRequestRead | None
    linkedin: LinkedInProfileRead | None
    linkedin_review: LinkedInReviewRequestRead | None
    interviews: list[MockInterviewRead]
    credits: list[CreditBalanceRead]


# --- Resume / LinkedIn review queues --------------------------------------


class ResumeReviewQueueItem(BaseModel):
    review: ReviewRequestRead
    candidate: CandidateSummary
    resume_version: int
    resume_filename: str


class LinkedInReviewQueueItem(BaseModel):
    review: LinkedInReviewRequestRead
    candidate: CandidateSummary


class CompleteReviewRequest(BaseModel):
    """Shared shape for both resume and LinkedIn review completion.
    reviewer_type is deliberately not a field here -- the route always
    passes ReviewerType.HUMAN itself (PRD section 21: the admin UI must
    never be able to claim AI when no AI provider exists)."""

    score: int | None = Field(default=None, ge=0, le=100)
    summary: str = Field(min_length=1, max_length=4000)
    strengths: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)


# --- Mock interviews / slots -----------------------------------------------


class MockInterviewAdminItem(BaseModel):
    interview: MockInterviewRead
    candidate: CandidateSummary


class AdminInterviewSlotRead(BaseModel):
    """Separate from the candidate-facing InterviewSlotRead (which only
    ever shows OPEN slots, so it never needed a status field) -- an
    admin needs to see OPEN/BOOKED/CANCELLED to manage slots."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    interview_type: str
    starts_at: datetime
    ends_at: datetime
    status: str


class CreateSlotRequest(BaseModel):
    interview_type: InterviewType
    starts_at: datetime
    ends_at: datetime

    @model_validator(mode="after")
    def validate_window(self) -> "CreateSlotRequest":
        if self.starts_at >= self.ends_at:
            raise ValueError("starts_at must be before ends_at")
        return self


class CompleteInterviewRequest(BaseModel):
    communication_score: int = Field(ge=0, le=10)
    confidence_score: int = Field(ge=0, le=10)
    technical_score: int = Field(ge=0, le=10)
    answer_structure_score: int = Field(ge=0, le=10)
    professional_presentation_score: int = Field(ge=0, le=10)
    overall_score: int = Field(ge=0, le=100)
    feedback: str = Field(min_length=1, max_length=4000)
    recommendations: list[str] = Field(default_factory=list)


# --- Events ------------------------------------------------------------


class AdminEventItem(BaseModel):
    """Admin list/detail projection of an Event -- unlike the
    candidate-facing EventRead, this exposes the raw stored status
    (including DRAFT) plus the registration count."""

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
    registration_count: int = 0


class EventRegistrationAdminItem(BaseModel):
    id: uuid.UUID
    registered_at: datetime
    candidate: CandidateSummary


# --- Credits ---------------------------------------------------------------


class GrantCreditRequest(BaseModel):
    candidate_id: uuid.UUID
    credit_type: CreditType
    amount: int = Field(gt=0, le=1000)
    reason: CreditTransactionReason = CreditTransactionReason.ADMIN_ADJUSTMENT
    description: str | None = Field(default=None, max_length=500)

    @field_validator("description")
    @classmethod
    def strip_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class CreditGrantTransaction(BaseModel):
    transaction: CreditTransactionRead
    candidate: CandidateSummary


# --- Dashboard ---------------------------------------------------------


class AdminDashboardMetrics(BaseModel):
    total_candidates: int
    pending_resume_reviews: int
    pending_linkedin_reviews: int
    upcoming_interviews: int
    completed_interviews: int
    total_credit_transactions: int


class RecentCandidate(BaseModel):
    id: uuid.UUID
    email: str
    first_name: str | None
    last_name: str | None
    created_at: datetime


class AdminDashboardResponse(BaseModel):
    metrics: AdminDashboardMetrics
    recent_candidates: list[RecentCandidate]
    recent_resume_reviews: list[ResumeReviewQueueItem]
    recent_linkedin_reviews: list[LinkedInReviewQueueItem]
