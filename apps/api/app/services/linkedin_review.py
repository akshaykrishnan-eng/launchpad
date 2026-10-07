import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.credits import CreditTransactionReason, CreditType, InsufficientCreditError
from app.core.linkedin import LINKEDIN_REVIEW_CREDIT_COST
from app.core.review import ReviewerType, ReviewRequestStatus
from app.models.candidate_profile import CandidateProfile
from app.models.linkedin_profile import LinkedInProfile
from app.models.linkedin_review_request import LinkedInReviewRequest
from app.models.linkedin_review_result import LinkedInReviewResult
from app.services.credits import build_debit_transaction, get_balance


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
    db: AsyncSession, linkedin_profile: LinkedInProfile, profile: CandidateProfile
) -> LinkedInReviewRequest:
    """Atomically: lock the candidate's own credit ledger, verify the
    review can legally be requested and the balance covers it, then
    debit the credit and create the request together -- same pattern
    as app/services/resume_review.py:request_review /
    app/services/mock_interview.py:book_interview.

    Raises DuplicateActiveReviewError or InsufficientCreditError --
    callers map these to HTTP errors.
    """
    existing = await get_latest_review(db, linkedin_profile)
    if existing is not None and existing.status != ReviewRequestStatus.COMPLETED:
        raise DuplicateActiveReviewError

    # Locks this candidate's own profile row, serializing concurrent
    # review-request attempts *for this candidate only* -- see
    # app/services/resume_review.py:request_review for the fuller note.
    await db.execute(
        select(CandidateProfile.id).where(CandidateProfile.id == profile.id).with_for_update()
    )

    balance = await get_balance(db, profile, CreditType.LINKEDIN_REVIEW)
    if balance < LINKEDIN_REVIEW_CREDIT_COST:
        raise InsufficientCreditError(
            CreditType.LINKEDIN_REVIEW, LINKEDIN_REVIEW_CREDIT_COST, balance
        )

    review_request_id = uuid.uuid4()
    debit = build_debit_transaction(
        profile.id,
        CreditType.LINKEDIN_REVIEW,
        -LINKEDIN_REVIEW_CREDIT_COST,
        CreditTransactionReason.LINKEDIN_REVIEW_REQUEST,
        reference_type="LINKEDIN_REVIEW_REQUEST",
        reference_id=review_request_id,
    )
    db.add(debit)

    review_request = LinkedInReviewRequest(
        id=review_request_id,
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
        # caught a race the status check above missed. Rolling back
        # here also undoes the debit added above in the same flush.
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
