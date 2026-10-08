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


def test_work_experience_is_next_action_when_candidate_has_not_yet_passed_it() -> None:
    """Experience is still the next action when the candidate hasn't
    moved on to career_preferences or career_goal yet -- they're still
    at (or approaching) that step."""
    action = determine_next_action(
        _breakdown(experience=False, career_preferences=False, career_goal=False)
    )

    assert action.type == NextActionType.WORK_EXPERIENCE
    assert action.route == "/onboarding/experience"


def test_work_experience_is_skipped_when_candidate_has_completed_career_preferences() -> None:
    """Experience is optional.  A candidate who navigated through the
    experience screen without adding entries and then completed career
    preferences has consciously moved past experience.  next_action
    must NOT return WORK_EXPERIENCE -- it must skip to career_goal."""
    action = determine_next_action(
        _breakdown(experience=False, career_preferences=True, career_goal=False)
    )

    assert action.type == NextActionType.CAREER_GOAL
    assert action.route == "/onboarding/goal"


def test_profile_complete_when_experience_skipped_and_all_other_steps_done() -> None:
    """Skipping work experience must not prevent PROFILE_COMPLETE once
    all other required sections are satisfied."""
    action = determine_next_action(
        _breakdown(experience=False, career_preferences=True, career_goal=True)
    )

    assert action.type == NextActionType.PROFILE_COMPLETE


def test_work_experience_is_skipped_when_only_career_goal_is_complete() -> None:
    """career_goal being done is also sufficient evidence the candidate
    has moved past the experience step."""
    action = determine_next_action(
        _breakdown(experience=False, career_preferences=False, career_goal=True)
    )

    assert action.type == NextActionType.CAREER_PREFERENCES


def test_priority_order_still_respected_when_earlier_step_also_missing() -> None:
    """Even with the experience-skip rule, an earlier required step
    (like skills) must still take priority."""
    action = determine_next_action(
        _breakdown(skills=False, experience=False, career_preferences=True)
    )

    assert action.type == NextActionType.SKILLS


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
