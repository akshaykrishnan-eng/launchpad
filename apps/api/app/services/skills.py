import uuid

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.candidate_profile import CandidateProfile
from app.models.candidate_skill import CandidateSkill
from app.models.skill import Skill


class DuplicateSkillError(Exception):
    pass


async def list_candidate_skills(
    db: AsyncSession, profile: CandidateProfile
) -> list[CandidateSkill]:
    result = await db.execute(
        select(CandidateSkill)
        .options(selectinload(CandidateSkill.skill))
        .where(CandidateSkill.candidate_profile_id == profile.id)
        .order_by(CandidateSkill.created_at)
    )
    return list(result.scalars())


async def _get_or_create_skill(db: AsyncSession, name: str) -> Skill:
    result = await db.execute(select(Skill).where(func.lower(Skill.name) == name.lower()))
    skill = result.scalar_one_or_none()
    if skill is not None:
        return skill

    skill = Skill(name=name)
    db.add(skill)
    try:
        await db.flush()
    except IntegrityError:
        # Lost a race with another request creating the same skill name;
        # the catalog is shared across all candidates.
        await db.rollback()
        result = await db.execute(select(Skill).where(func.lower(Skill.name) == name.lower()))
        skill = result.scalar_one()
    return skill


async def add_skill(
    db: AsyncSession, profile: CandidateProfile, name: str
) -> CandidateSkill:
    skill = await _get_or_create_skill(db, name)

    existing = await db.execute(
        select(CandidateSkill).where(
            CandidateSkill.candidate_profile_id == profile.id,
            CandidateSkill.skill_id == skill.id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise DuplicateSkillError

    candidate_skill = CandidateSkill(candidate_profile_id=profile.id, skill_id=skill.id)
    db.add(candidate_skill)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise DuplicateSkillError from exc

    await db.refresh(candidate_skill, attribute_names=["skill"])
    return candidate_skill


async def get_owned_candidate_skill(
    db: AsyncSession, profile: CandidateProfile, candidate_skill_id: uuid.UUID
) -> CandidateSkill | None:
    result = await db.execute(
        select(CandidateSkill).where(
            CandidateSkill.id == candidate_skill_id,
            CandidateSkill.candidate_profile_id == profile.id,
        )
    )
    return result.scalar_one_or_none()


async def remove_skill(db: AsyncSession, candidate_skill: CandidateSkill) -> None:
    await db.delete(candidate_skill)
    await db.commit()
