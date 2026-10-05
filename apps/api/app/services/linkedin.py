from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.review import ReviewRequestStatus
from app.models.candidate_profile import CandidateProfile
from app.models.linkedin_profile import LinkedInProfile
from app.models.linkedin_review_request import LinkedInReviewRequest


class ActiveReviewBlocksEditError(Exception):
    """Raised when trying to update the URL while a review is REQUESTED
    or IN_REVIEW. This is a UX/product-safety guard against reviewing
    one URL while the candidate believes they're being reviewed on
    another -- it is not what actually guarantees correctness, since
    LinkedInReviewRequest.profile_url_snapshot makes misattribution
    impossible regardless. A simple re-check is enough here; see the
    README's LinkedIn Centre section for the full reasoning."""


async def get_profile(db: AsyncSession, profile: CandidateProfile) -> LinkedInProfile | None:
    result = await db.execute(
        select(LinkedInProfile).where(LinkedInProfile.candidate_profile_id == profile.id)
    )
    return result.scalar_one_or_none()


async def has_active_review(db: AsyncSession, linkedin_profile: LinkedInProfile) -> bool:
    result = await db.execute(
        select(LinkedInReviewRequest.id).where(
            LinkedInReviewRequest.linkedin_profile_id == linkedin_profile.id,
            LinkedInReviewRequest.status != ReviewRequestStatus.COMPLETED,
        )
    )
    return result.scalar_one_or_none() is not None


async def upsert_profile(
    db: AsyncSession, profile: CandidateProfile, normalized_url: str
) -> LinkedInProfile:
    existing = await get_profile(db, profile)

    if existing is not None:
        if await has_active_review(db, existing):
            raise ActiveReviewBlocksEditError
        existing.profile_url = normalized_url
        await db.commit()
        await db.refresh(existing)
        return existing

    linkedin_profile = LinkedInProfile(
        candidate_profile_id=profile.id, profile_url=normalized_url
    )
    db.add(linkedin_profile)
    await db.commit()
    await db.refresh(linkedin_profile)
    return linkedin_profile
