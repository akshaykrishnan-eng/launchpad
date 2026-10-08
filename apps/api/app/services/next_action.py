from app.schemas.dashboard import NextAction, NextActionType
from app.services.profile_completion import CompletionBreakdown

# Deterministic priority order -- the first incomplete component in this
# list wins. Matches the order profile_completion's weights are listed
# in (personal info first since every later step implicitly assumes
# you've identified yourself; career goal last since it's the most
# reflective/open-ended step and most natural to do once everything
# concrete is in place). No AI, no randomness: this is a fixed lookup
# over six booleans.
_PRIORITY: list[tuple[str, NextActionType, str, str, str]] = [
    (
        "personal_information",
        NextActionType.PERSONAL_INFORMATION,
        "Complete your personal information",
        "Add your name, mobile number, city, and current status.",
        "/onboarding/about",
    ),
    (
        "education",
        NextActionType.EDUCATION,
        "Add your education",
        "Tell us about your most recent degree or program.",
        "/onboarding/education",
    ),
    (
        "skills",
        NextActionType.SKILLS,
        "Add your skills",
        "List the skills you want recruiters to see.",
        "/onboarding/skills",
    ),
    (
        "experience",
        NextActionType.WORK_EXPERIENCE,
        "Add your work experience",
        "Add any job, internship, or part-time role you've held.",
        "/onboarding/experience",
    ),
    (
        "career_preferences",
        NextActionType.CAREER_PREFERENCES,
        "Set your career preferences",
        "Tell us which roles and locations you're interested in.",
        "/onboarding/career",
    ),
    (
        "career_goal",
        NextActionType.CAREER_GOAL,
        "Add your career goal",
        "Describe the kind of job you're looking for.",
        "/onboarding/goal",
    ),
]


def determine_next_action(breakdown: CompletionBreakdown) -> NextAction:
    """Returns the first incomplete component in priority order, or
    PROFILE_COMPLETE if every component is already satisfied."""
    for field_name, action_type, title, description, route in _PRIORITY:
        if not getattr(breakdown, field_name):
            return NextAction(type=action_type, title=title, description=description, route=route)

    return NextAction(
        type=NextActionType.PROFILE_COMPLETE,
        title="Your profile is complete \U0001f389",
        description="Nice work -- your Launchpad profile is fully filled out.",
        route="/app/profile",
    )
