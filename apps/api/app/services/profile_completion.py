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


def calculate_profile_completion(data: CompletionInput) -> int:
    """Pure function: no I/O, fully deterministic given its inputs.
    Each component contributes its full weight or nothing."""
    percentage = 0

    if _personal_info_complete(data.profile):
        percentage += PERSONAL_INFO_WEIGHT
    if data.education_count > 0:
        percentage += EDUCATION_WEIGHT
    if data.skill_count > 0:
        percentage += SKILLS_WEIGHT
    if data.experience_count > 0:
        percentage += EXPERIENCE_WEIGHT
    if _preferences_complete(data.career_preference):
        percentage += PREFERENCES_WEIGHT
    if data.profile.career_goal:
        percentage += CAREER_GOAL_WEIGHT

    return percentage
