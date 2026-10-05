from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.review import ReviewerType, ReviewRequestStatus
from app.models.linkedin_profile import LinkedInProfile
from app.models.linkedin_review_request import LinkedInReviewRequest
from app.models.linkedin_review_result import LinkedInReviewResult


class DuplicateActiveReviewError(Exception):
    """A LinkedIn profile already has a review that hasn't reached
    COMPLETED."""


async def get_latest_review(
    db: AsyncSession, linkedin_profile: LinkedInProfile
) -> LinkedInReviewRequest | None:
    result = await db.execute(
        select(LinkedInReviewRequest)
        .options(selectinload(LinkedInReviewRequest.result))
        .where(LinkedInReviewRequest.linkedin_profile_id == linkedin_profile.id)
        .order_by(LinkedInReviewRequest.requested_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def request_review(
    db: AsyncSession, linkedin_profile: LinkedInProfile
) -> LinkedInReviewRequest:
    existing = await get_latest_review(db, linkedin_profile)
    if existing is not None and existing.status != ReviewRequestStatus.COMPLETED:
        raise DuplicateActiveReviewError

    review_request = LinkedInReviewRequest(
        linkedin_profile_id=linkedin_profile.id,
        candidate_profile_id=linkedin_profile.candidate_profile_id,
        # Frozen at request time: this review is forever about *this*
        # URL, even if the candidate's current URL changes later.
        profile_url_snapshot=linkedin_profile.profile_url,
        status=ReviewRequestStatus.REQUESTED,
    )
    db.add(review_request)

    try:
        await db.flush()
    except IntegrityError as exc:
        # The partial unique index (one active request per profile)
        # caught a race the status check above missed.
        await db.rollback()
        raise DuplicateActiveReviewError from exc

    await db.commit()
    await db.refresh(review_request)
    return review_request


async def start_review(
    db: AsyncSession, review_request: LinkedInReviewRequest
) -> LinkedInReviewRequest:
    """Not exposed through any candidate endpoint in this phase -- same
    rationale as app/services/resume_review.py::start_review."""
    review_request.status = ReviewRequestStatus.IN_REVIEW
    review_request.started_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(review_request)
    return review_request


async def complete_review(
    db: AsyncSession,
    review_request: LinkedInReviewRequest,
    *,
    summary: str,
    reviewer_type: ReviewerType,
    score: int | None = None,
    strengths: list[str] | None = None,
    improvements: list[str] | None = None,
    recommendations: list[str] | None = None,
) -> LinkedInReviewResult:
    """Not exposed through any candidate endpoint: written manually (or
    by a future reviewer tool) exactly as in Phase 5 -- never fabricated
    by the API itself."""
    result = LinkedInReviewResult(
        review_request_id=review_request.id,
        score=score,
        summary=summary,
        strengths=strengths or [],
        improvements=improvements or [],
        recommendations=recommendations or [],
        reviewer_type=reviewer_type,
    )
    db.add(result)

    review_request.status = ReviewRequestStatus.COMPLETED
    review_request.completed_at = datetime.now(UTC)

    await db.commit()
    await db.refresh(result)
    return result
