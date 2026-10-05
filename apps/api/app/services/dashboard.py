from sqlalchemy.ext.asyncio import AsyncSession

from app.models.candidate_profile import CandidateProfile
from app.schemas.dashboard import (
    CandidateSummary,
    DashboardResponse,
    ProfileCompletionComponents,
    ProfileCompletionSummary,
)
from app.services.candidate_profile import get_completion_breakdown_for
from app.services.next_action import determine_next_action


async def build_dashboard(db: AsyncSession, profile: CandidateProfile) -> DashboardResponse:
    """Aggregates existing candidate/profile services into the single
    response the dashboard needs -- no new persistence, no business
    logic of its own, and no duplicated completion calculation."""
    breakdown = await get_completion_breakdown_for(db, profile)

    return DashboardResponse(
        candidate=CandidateSummary(first_name=profile.first_name, last_name=profile.last_name),
        profile_completion=ProfileCompletionSummary(
            percentage=breakdown.percentage,
            components=ProfileCompletionComponents(
                personal_information=breakdown.personal_information,
                education=breakdown.education,
                skills=breakdown.skills,
                experience=breakdown.experience,
                career_preferences=breakdown.career_preferences,
                career_goal=breakdown.career_goal,
            ),
        ),
        next_action=determine_next_action(breakdown),
    )
