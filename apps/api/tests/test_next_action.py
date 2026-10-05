from app.schemas.dashboard import NextActionType
from app.services.next_action import determine_next_action
from app.services.profile_completion import CompletionBreakdown

ALL_TRUE = {
    "personal_information": True,
    "education": True,
    "skills": True,
    "experience": True,
    "career_preferences": True,
    "career_goal": True,
}


def _breakdown(**overrides) -> CompletionBreakdown:
    fields = {**ALL_TRUE, **overrides}
    return CompletionBreakdown(**fields, percentage=0)


def test_profile_complete_when_every_component_is_done() -> None:
    action = determine_next_action(_breakdown())

    assert action.type == NextActionType.PROFILE_COMPLETE


def test_personal_information_has_top_priority() -> None:
    action = determine_next_action(
        _breakdown(personal_information=False, education=False, skills=False)
    )

    assert action.type == NextActionType.PERSONAL_INFORMATION
    assert action.route == "/onboarding/about"


def test_education_is_next_action_when_only_education_is_missing() -> None:
    action = determine_next_action(_breakdown(education=False))

    assert action.type == NextActionType.EDUCATION
    assert action.route == "/onboarding/education"


def test_skills_is_next_action_when_only_skills_is_missing() -> None:
    action = determine_next_action(_breakdown(skills=False))

    assert action.type == NextActionType.SKILLS
    assert action.route == "/onboarding/skills"


def test_work_experience_is_next_action_when_only_experience_is_missing() -> None:
    action = determine_next_action(_breakdown(experience=False))

    assert action.type == NextActionType.WORK_EXPERIENCE
    assert action.route == "/app/profile"


def test_career_preferences_is_next_action_when_only_preferences_is_missing() -> None:
    action = determine_next_action(_breakdown(career_preferences=False))

    assert action.type == NextActionType.CAREER_PREFERENCES
    assert action.route == "/onboarding/career"


def test_career_goal_is_next_action_when_only_goal_is_missing() -> None:
    action = determine_next_action(_breakdown(career_goal=False))

    assert action.type == NextActionType.CAREER_GOAL
    assert action.route == "/onboarding/goal"


def test_priority_order_is_fixed_regardless_of_which_combination_is_missing() -> None:
    """Multiple components can be incomplete at once; the earliest one
    in priority order must always win, deterministically."""
    action = determine_next_action(
        _breakdown(skills=False, career_goal=False, career_preferences=False)
    )

    assert action.type == NextActionType.SKILLS


def test_determination_is_deterministic() -> None:
    breakdown = _breakdown(education=False)

    results = {determine_next_action(breakdown).type for _ in range(5)}

    assert results == {NextActionType.EDUCATION}
