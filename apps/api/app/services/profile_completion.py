from dataclasses import dataclass

from app.models.candidate_profile import CandidateProfile
from app.models.career_preference import CareerPreference

# Deterministic, documented weights (sum to 100). Each component is
# binary -- either fully satisfied or not -- rather than partially
# scored, which keeps the calculation simple and unambiguous. Resume,
# LinkedIn, interviews, and other future modules are intentionally
# excluded: this percentage measures the identity/onboarding profile
# built in this phase, not overall "launch readiness".
PERSONAL_INFO_WEIGHT = 20
EDUCATION_WEIGHT = 20
SKILLS_WEIGHT = 15
EXPERIENCE_WEIGHT = 15
PREFERENCES_WEIGHT = 15
CAREER_GOAL_WEIGHT = 15

assert (
    PERSONAL_INFO_WEIGHT
    + EDUCATION_WEIGHT
    + SKILLS_WEIGHT
    + EXPERIENCE_WEIGHT
    + PREFERENCES_WEIGHT
    + CAREER_GOAL_WEIGHT
    == 100
)


@dataclass(frozen=True)
class CompletionInput:
    profile: CandidateProfile
    education_count: int
    skill_count: int
    experience_count: int
    career_preference: CareerPreference | None


def _personal_info_complete(profile: CandidateProfile) -> bool:
    return bool(
        profile.first_name
        and profile.last_name
        and profile.mobile_number
        and profile.current_city
        and profile.current_status
    )


def _preferences_complete(preference: CareerPreference | None) -> bool:
    if preference is None:
        return False
    return bool(preference.preferred_roles) and bool(preference.preferred_locations)


@dataclass(frozen=True)
class CompletionBreakdown:
    """The same six components the percentage is built from, exposed
    individually. The dashboard (Phase 4) needs these booleans directly
    -- re-deriving them from a bare percentage would be both lossy
    (multiple component combinations can sum to the same number) and a
    second place the weighting logic could drift out of sync."""

    personal_information: bool
    education: bool
    skills: bool
    experience: bool
    career_preferences: bool
    career_goal: bool
    percentage: int


def calculate_profile_completion_breakdown(data: CompletionInput) -> CompletionBreakdown:
    """Pure function: no I/O, fully deterministic given its inputs.
    Each component contributes its full weight or nothing."""
    personal_information = _personal_info_complete(data.profile)
    education = data.education_count > 0
    skills = data.skill_count > 0
    experience = data.experience_count > 0
    career_preferences = _preferences_complete(data.career_preference)
    career_goal = bool(data.profile.career_goal)

    percentage = sum(
        [
            PERSONAL_INFO_WEIGHT if personal_information else 0,
            EDUCATION_WEIGHT if education else 0,
            SKILLS_WEIGHT if skills else 0,
            EXPERIENCE_WEIGHT if experience else 0,
            PREFERENCES_WEIGHT if career_preferences else 0,
            CAREER_GOAL_WEIGHT if career_goal else 0,
        ]
    )

    return CompletionBreakdown(
        personal_information=personal_information,
        education=education,
        skills=skills,
        experience=experience,
        career_preferences=career_preferences,
        career_goal=career_goal,
        percentage=percentage,
    )


def calculate_profile_completion(data: CompletionInput) -> int:
    """Percentage only. Prefer calculate_profile_completion_breakdown
    when the individual component states are also needed (e.g. the
    dashboard), rather than computing it twice."""
    return calculate_profile_completion_breakdown(data).percentage
