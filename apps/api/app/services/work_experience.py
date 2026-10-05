import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.candidate_profile import CandidateProfile
from app.models.work_experience import WorkExperience
from app.schemas.candidate import WorkExperienceCreate, WorkExperienceUpdate


async def list_experience(
    db: AsyncSession, profile: CandidateProfile
) -> list[WorkExperience]:
    result = await db.execute(
        select(WorkExperience)
        .where(WorkExperience.candidate_profile_id == profile.id)
        .order_by(WorkExperience.start_date.desc())
    )
    return list(result.scalars())


async def create_experience(
    db: AsyncSession, profile: CandidateProfile, payload: WorkExperienceCreate
) -> WorkExperience:
    entry = WorkExperience(candidate_profile_id=profile.id, **payload.model_dump())
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


async def get_owned_experience(
    db: AsyncSession, profile: CandidateProfile, experience_id: uuid.UUID
) -> WorkExperience | None:
    result = await db.execute(
        select(WorkExperience).where(
            WorkExperience.id == experience_id,
            WorkExperience.candidate_profile_id == profile.id,
        )
    )
    return result.scalar_one_or_none()


async def update_experience(
    db: AsyncSession, entry: WorkExperience, payload: WorkExperienceUpdate
) -> WorkExperience:
    updates = payload.model_dump(exclude_unset=True)

    # Re-validate the combined (existing + incoming) state: a PATCH that
    # only sends end_date, for example, must still be checked against
    # the entry's existing start_date/is_current. Pydantic's
    # model_validator on WorkExperienceUpdate raises if the merged state
    # is invalid (e.g. a current job ending up with an end_date).
    merged = WorkExperienceUpdate(
        company=updates.get("company", entry.company),
        job_title=updates.get("job_title", entry.job_title),
        location=updates.get("location", entry.location),
        start_date=updates.get("start_date", entry.start_date),
        end_date=updates.get("end_date", entry.end_date),
        is_current=updates.get("is_current", entry.is_current),
        description=updates.get("description", entry.description),
    )

    for field in updates:
        setattr(entry, field, getattr(merged, field))

    await db.commit()
    await db.refresh(entry)
    return entry


async def delete_experience(db: AsyncSession, entry: WorkExperience) -> None:
    await db.delete(entry)
    await db.commit()
