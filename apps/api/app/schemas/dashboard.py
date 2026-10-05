from enum import StrEnum

from pydantic import BaseModel


class NextActionType(StrEnum):
    PERSONAL_INFORMATION = "PERSONAL_INFORMATION"
    EDUCATION = "EDUCATION"
    SKILLS = "SKILLS"
    WORK_EXPERIENCE = "WORK_EXPERIENCE"
    CAREER_PREFERENCES = "CAREER_PREFERENCES"
    CAREER_GOAL = "CAREER_GOAL"
    PROFILE_COMPLETE = "PROFILE_COMPLETE"


class CandidateSummary(BaseModel):
    first_name: str | None
    last_name: str | None


class ProfileCompletionComponents(BaseModel):
    personal_information: bool
    education: bool
    skills: bool
    experience: bool
    career_preferences: bool
    career_goal: bool


class ProfileCompletionSummary(BaseModel):
    percentage: int
    components: ProfileCompletionComponents


class NextAction(BaseModel):
    type: NextActionType
    title: str
    description: str
    route: str


class DashboardResponse(BaseModel):
    candidate: CandidateSummary
    profile_completion: ProfileCompletionSummary
    next_action: NextAction
