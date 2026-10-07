import uuid

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.candidate_profile import CandidateProfile
from app.models.candidate_skill import CandidateSkill
from app.models.career_preference import CareerPreference
from app.models.education import Education
from app.models.work_experience import WorkExperience
from app.schemas.candidate import CandidateProfileRead, CandidateProfileUpdate
from app.services.profile_completion import (
    CompletionBreakdown,
    CompletionInput,
    calculate_profile_completion_breakdown,
)


async def get_or_create_profile(db: AsyncSession, user_id: uuid.UUID) -> CandidateProfile:
    """Every authenticated candidate implicitly owns exactly one profile.
    There's no separate "create profile" step in the API: the first
    GET/PATCH a candidate makes creates the row."""
    result = await db.execute(
        select(CandidateProfile).where(CandidateProfile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()
    if profile is not None:
        return profile

    profile = CandidateProfile(user_id=user_id)
    db.add(profile)

    try:
        await db.commit()
    except IntegrityError:
        # Another concurrent call for the same user (e.g. two resume
        # uploads landing at once on a brand-new candidate) won the
        # race and created the profile first; the unique constraint on
        # user_id is the actual source of truth, not the SELECT above.
        await db.rollback()
        result = await db.execute(
            select(CandidateProfile).where(CandidateProfile.user_id == user_id)
        )
        return result.scalar_one()

    await db.refresh(profile)
    return profile


async def update_profile(
    db: AsyncSession, profile: CandidateProfile, update: CandidateProfileUpdate
) -> CandidateProfile:
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    await db.commit()
    await db.refresh(profile)
    return profile


async def _build_completion_input(db: AsyncSession, profile: CandidateProfile) -> CompletionInput:
    education_count = (
        await db.execute(
            select(func.count())
            .select_from(Education)
            .where(Education.candidate_profile_id == profile.id)
        )
    ).scalar_one()
    skill_count = (
        await db.execute(
            select(func.count())
            .select_from(CandidateSkill)
            .where(CandidateSkill.candidate_profile_id == profile.id)
        )
    ).scalar_one()
    experience_count = (
        await db.execute(
            select(func.count())
            .select_from(WorkExperience)
            .where(WorkExperience.candidate_profile_id == profile.id)
        )
    ).scalar_one()
    preference = (
        await db.execute(
            select(CareerPreference).where(CareerPreference.candidate_profile_id == profile.id)
        )
    ).scalar_one_or_none()

    return CompletionInput(
        profile=profile,
        education_count=education_count,
        skill_count=skill_count,
        experience_count=experience_count,
        career_preference=preference,
    )


async def get_completion_breakdown_for(
    db: AsyncSession, profile: CandidateProfile
) -> CompletionBreakdown:
    return calculate_profile_completion_breakdown(await _build_completion_input(db, profile))


async def calculate_completion_for(db: AsyncSession, profile: CandidateProfile) -> int:
    return (await get_completion_breakdown_for(db, profile)).percentage


async def build_profile_read(db: AsyncSession, profile: CandidateProfile) -> CandidateProfileRead:
    """Shared by the candidate's own /profile endpoint and the admin
    Candidate 360 view (Phase 8) -- one place that knows how to turn a
    CandidateProfile row (whose completion_percentage isn't a real
    column) into the API-facing shape."""
    completion = await calculate_completion_for(db, profile)
    return CandidateProfileRead(
        id=profile.id,
        user_id=profile.user_id,
        first_name=profile.first_name,
        last_name=profile.last_name,
        mobile_number=profile.mobile_number,
        current_city=profile.current_city,
        current_status=profile.current_status,
        degree=profile.degree,
        specialisation=profile.specialisation,
        graduation_year=profile.graduation_year,
        career_goal=profile.career_goal,
        completion_percentage=completion,
    )
