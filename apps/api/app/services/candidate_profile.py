import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.candidate_profile import CandidateProfile
from app.models.candidate_skill import CandidateSkill
from app.models.career_preference import CareerPreference
from app.models.education import Education
from app.models.work_experience import WorkExperience
from app.schemas.candidate import CandidateProfileUpdate
from app.services.profile_completion import CompletionInput, calculate_profile_completion


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
    await db.commit()
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


async def calculate_completion_for(db: AsyncSession, profile: CandidateProfile) -> int:
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

    return calculate_profile_completion(
        CompletionInput(
            profile=profile,
            education_count=education_count,
            skill_count=skill_count,
            experience_count=experience_count,
            career_preference=preference,
        )
    )
