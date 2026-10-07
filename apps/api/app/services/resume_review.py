import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.credits import CreditTransactionReason, CreditType, InsufficientCreditError
from app.core.resume import RESUME_REVIEW_CREDIT_COST, ResumeStatus
from app.core.review import ReviewerType, ReviewRequestStatus
from app.models.candidate_profile import CandidateProfile
from app.models.resume import Resume
from app.models.review_request import ReviewRequest
from app.models.review_result import ReviewResult
from app.services.credits import build_debit_transaction, get_balance


class DuplicateActiveReviewError(Exception):
    """A resume already has a review that hasn't reached COMPLETED."""


async def get_latest_review(db: AsyncSession, resume: Resume) -> ReviewRequest | None:
    result = await db.execute(
        select(ReviewRequest)
        .options(selectinload(ReviewRequest.result))
        .where(ReviewRequest.resume_id == resume.id)
        .order_by(ReviewRequest.requested_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def request_review(
    db: AsyncSession, resume: Resume, profile: CandidateProfile
) -> ReviewRequest:
    """Atomically: lock the candidate's own credit ledger, verify the
    review can legally be requested and the balance covers it, then
    debit the credit and create the request together -- same pattern
    as app/services/mock_interview.py:book_interview. If the flush
    below fails (e.g. the partial-unique-index race), the whole
    transaction (debit included) rolls back, so a failed request never
    leaves the candidate charged without one (PRD section 5/41).

    Raises DuplicateActiveReviewError or InsufficientCreditError --
    callers map these to HTTP errors.
    """
    existing = await get_latest_review(db, resume)
    if existing is not None and existing.status != ReviewRequestStatus.COMPLETED:
        raise DuplicateActiveReviewError

    # Locks this candidate's own profile row, serializing concurrent
    # review-request attempts *for this candidate only* -- the same
    # technique as book_interview, which is what makes the balance
    # check below race-safe.
    await db.execute(
        select(CandidateProfile.id).where(CandidateProfile.id == profile.id).with_for_update()
    )

    balance = await get_balance(db, profile, CreditType.RESUME_REVIEW)
    if balance < RESUME_REVIEW_CREDIT_COST:
        raise InsufficientCreditError(CreditType.RESUME_REVIEW, RESUME_REVIEW_CREDIT_COST, balance)

    review_request_id = uuid.uuid4()
    debit = build_debit_transaction(
        profile.id,
        CreditType.RESUME_REVIEW,
        -RESUME_REVIEW_CREDIT_COST,
        CreditTransactionReason.RESUME_REVIEW_REQUEST,
        reference_type="REVIEW_REQUEST",
        reference_id=review_request_id,
    )
    db.add(debit)

    review_request = ReviewRequest(
        id=review_request_id,
        resume_id=resume.id,
        candidate_profile_id=resume.candidate_profile_id,
        status=ReviewRequestStatus.REQUESTED,
    )
    db.add(review_request)
    resume.status = ResumeStatus.UNDER_REVIEW

    try:
        await db.flush()
    except IntegrityError as exc:
        # The partial unique index (one active request per resume)
        # caught a race the status check above missed. Rolling back
        # here also undoes the debit added above in the same flush.
        await db.rollback()
        raise DuplicateActiveReviewError from exc

    await db.commit()
    await db.refresh(review_request)
    return review_request


async def start_review(db: AsyncSession, review_request: ReviewRequest) -> ReviewRequest:
    """Not exposed through any candidate endpoint in this phase -- a
    future reviewer/AI-provider integration calls this once work on a
    request actually begins, without the candidate-facing workflow
    changing at all."""
    review_request.status = ReviewRequestStatus.IN_REVIEW
    review_request.started_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(review_request)
    return review_request


async def complete_review(
    db: AsyncSession,
    review_request: ReviewRequest,
    *,
    summary: str,
    reviewer_type: ReviewerType,
    score: int | None = None,
    strengths: list[str] | None = None,
    improvements: list[str] | None = None,
    recommendations: list[str] | None = None,
) -> ReviewResult:
    """Also not exposed through any candidate endpoint: in V1 there is
    no reviewer portal, so a completed result is written through this
    function directly (e.g. by a future reviewer tool, or manually for
    verification) -- never fabricated by the API itself."""
    result = ReviewResult(
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

    resume_result = await db.execute(select(Resume).where(Resume.id == review_request.resume_id))
    resume = resume_result.scalar_one()
    resume.status = ResumeStatus.COMPLETED

    await db.commit()
    await db.refresh(result)
    return result
