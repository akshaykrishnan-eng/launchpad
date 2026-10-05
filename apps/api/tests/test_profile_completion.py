from app.models.candidate_profile import CandidateProfile
from app.models.career_preference import CareerPreference
from app.services.profile_completion import CompletionInput, calculate_profile_completion


def _profile(**overrides) -> CandidateProfile:
    defaults = {
        "first_name": None,
        "last_name": None,
        "mobile_number": None,
        "current_city": None,
        "current_status": None,
        "career_goal": None,
    }
    defaults.update(overrides)
    return CandidateProfile(**defaults)


def test_empty_profile_is_zero_percent() -> None:
    result = calculate_profile_completion(
        CompletionInput(
            profile=_profile(),
            education_count=0,
            skill_count=0,
            experience_count=0,
            career_preference=None,
        )
    )

    assert result == 0


def test_fully_completed_profile_is_100_percent() -> None:
    profile = _profile(
        first_name="Dana",
        last_name="Smith",
        mobile_number="+1234567890",
        current_city="Austin",
        current_status="STUDENT",
        career_goal="Become a backend engineer",
    )
    preference = CareerPreference(
        preferred_roles=["Software Developer"], preferred_locations=["Remote"]
    )

    result = calculate_profile_completion(
        CompletionInput(
            profile=profile,
            education_count=1,
            skill_count=1,
            experience_count=1,
            career_preference=preference,
        )
    )

    assert result == 100


def test_partial_completion_only_counts_satisfied_components() -> None:
    profile = _profile(
        first_name="Dana",
        last_name="Smith",
        mobile_number="+1234567890",
        current_city="Austin",
        current_status="STUDENT",
    )

    result = calculate_profile_completion(
        CompletionInput(
            profile=profile,
            education_count=1,
            skill_count=0,
            experience_count=0,
            career_preference=None,
        )
    )

    # personal info (20) + education (20) = 40
    assert result == 40


def test_personal_info_requires_all_fields() -> None:
    profile = _profile(first_name="Dana")  # missing last_name, mobile, city, status

    result = calculate_profile_completion(
        CompletionInput(
            profile=profile,
            education_count=0,
            skill_count=0,
            experience_count=0,
            career_preference=None,
        )
    )

    assert result == 0


def test_career_preference_requires_both_roles_and_locations() -> None:
    profile = _profile()
    preference_roles_only = CareerPreference(
        preferred_roles=["Software Developer"], preferred_locations=[]
    )

    result = calculate_profile_completion(
        CompletionInput(
            profile=profile,
            education_count=0,
            skill_count=0,
            experience_count=0,
            career_preference=preference_roles_only,
        )
    )

    assert result == 0


def test_calculation_is_deterministic() -> None:
    profile = _profile(first_name="Dana", last_name="Smith")
    data = CompletionInput(
        profile=profile,
        education_count=1,
        skill_count=0,
        experience_count=0,
        career_preference=None,
    )

    results = {calculate_profile_completion(data) for _ in range(5)}

    assert len(results) == 1
