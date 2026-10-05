from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.candidate_profile import CandidateProfile
from app.models.career_preference import CareerPreference
from app.schemas.candidate import CareerPreferenceUpdate


async def get_or_create_preference(
    db: AsyncSession, profile: CandidateProfile
) -> CareerPreference:
    result = await db.execute(
        select(CareerPreference).where(CareerPreference.candidate_profile_id == profile.id)
    )
    preference = result.scalar_one_or_none()
    if preference is not None:
        return preference

    preference = CareerPreference(candidate_profile_id=profile.id)
    db.add(preference)
    await db.commit()
    await db.refresh(preference)
    return preference


async def update_preference(
    db: AsyncSession, preference: CareerPreference, payload: CareerPreferenceUpdate
) -> CareerPreference:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(preference, field, value)
    await db.commit()
    await db.refresh(preference)
    return preference
