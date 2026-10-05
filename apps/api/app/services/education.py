import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.candidate_profile import CandidateProfile
from app.models.education import Education
from app.schemas.candidate import EducationCreate, EducationUpdate


async def list_education(db: AsyncSession, profile: CandidateProfile) -> list[Education]:
    result = await db.execute(
        select(Education)
        .where(Education.candidate_profile_id == profile.id)
        .order_by(Education.created_at)
    )
    return list(result.scalars())


async def create_education(
    db: AsyncSession, profile: CandidateProfile, payload: EducationCreate
) -> Education:
    entry = Education(candidate_profile_id=profile.id, **payload.model_dump())
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


async def get_owned_education(
    db: AsyncSession, profile: CandidateProfile, education_id: uuid.UUID
) -> Education | None:
    """Scoped to the given profile: a candidate can never fetch, update,
    or delete another candidate's education entry by guessing an id --
    the WHERE clause on candidate_profile_id is the ownership check."""
    result = await db.execute(
        select(Education).where(
            Education.id == education_id, Education.candidate_profile_id == profile.id
        )
    )
    return result.scalar_one_or_none()


async def update_education(
    db: AsyncSession, entry: Education, payload: EducationUpdate
) -> Education:
    updates = payload.model_dump(exclude_unset=True)

    # Re-validate the combined (existing + incoming) state, the same way
    # update_experience does: a PATCH touching only one of
    # start_year/graduation_year must still be checked against the
    # entry's existing value for the other.
    merged = EducationUpdate(
        institution=updates.get("institution", entry.institution),
        degree=updates.get("degree", entry.degree),
        specialization=updates.get("specialization", entry.specialization),
        start_year=updates.get("start_year", entry.start_year),
        graduation_year=updates.get("graduation_year", entry.graduation_year),
        education_status=updates.get("education_status", entry.education_status),
    )

    for field in updates:
        setattr(entry, field, getattr(merged, field))

    await db.commit()
    await db.refresh(entry)
    return entry


async def delete_education(db: AsyncSession, entry: Education) -> None:
    await db.delete(entry)
    await db.commit()
