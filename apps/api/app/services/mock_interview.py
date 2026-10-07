import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.credits import CreditTransactionReason, CreditType, InsufficientCreditError
from app.core.mock_interview import (
    MOCK_INTERVIEW_CREDIT_COST,
    InterviewStatus,
    InterviewType,
    InvalidBookingError,
    SlotStatus,
    SlotUnavailableError,
)
from app.models.candidate_profile import CandidateProfile
from app.models.interview_feedback import InterviewFeedback
from app.models.interview_slot import InterviewSlot
from app.models.mock_interview import MockInterview
from app.services.credits import build_debit_transaction, get_balance


class DuplicateBookingError(Exception):
    """Belt-and-suspenders around uq constraints on mock_interviews --
    see the IntegrityError catch in book_interview."""


async def create_slot(
    db: AsyncSession,
    interview_type: InterviewType,
    starts_at: datetime,
    ends_at: datetime,
    *,
    interviewer_id: uuid.UUID | None = None,
) -> InterviewSlot:
    """Not exposed through any candidate endpoint -- there's no
    interviewer portal in this phase (PRD section 14/39), so slots are
    created through controlled service/test/seed setup only."""
    slot = InterviewSlot(
        interviewer_id=interviewer_id,
        interview_type=interview_type,
        starts_at=starts_at,
        ends_at=ends_at,
        status=SlotStatus.OPEN,
    )
    db.add(slot)
    await db.commit()
    await db.refresh(slot)
    return slot


async def list_available_slots(
    db: AsyncSession, interview_type: InterviewType | None = None
) -> list[InterviewSlot]:
    query = select(InterviewSlot).where(
        InterviewSlot.status == SlotStatus.OPEN,
        InterviewSlot.starts_at > datetime.now(UTC),
    )
    if interview_type is not None:
        query = query.where(InterviewSlot.interview_type == interview_type)
    query = query.order_by(InterviewSlot.starts_at.asc())

    result = await db.execute(query)
    return list(result.scalars())


async def list_interviews(db: AsyncSession, profile: CandidateProfile) -> list[MockInterview]:
    result = await db.execute(
        select(MockInterview)
        .options(selectinload(MockInterview.feedback))
        .where(MockInterview.candidate_profile_id == profile.id)
        .order_by(MockInterview.scheduled_at.desc())
    )
    return list(result.scalars())


async def get_owned_interview(
    db: AsyncSession, profile: CandidateProfile, interview_id: uuid.UUID
) -> MockInterview | None:
    result = await db.execute(
        select(MockInterview)
        .options(selectinload(MockInterview.feedback))
        .where(
            MockInterview.id == interview_id,
            MockInterview.candidate_profile_id == profile.id,
        )
    )
    return result.scalar_one_or_none()


async def book_interview(
    db: AsyncSession,
    profile: CandidateProfile,
    slot_id: uuid.UUID,
    *,
    role: str | None = None,
) -> MockInterview:
    """Atomically: lock the slot, lock the candidate's own credit
    ledger, verify both, then create the booking and its debit
    transaction together. Locks are always acquired slot-then-profile
    (the only path that takes both), so there's no lock-order deadlock
    risk between concurrent bookings.

    Raises SlotUnavailableError, InvalidBookingError, or
    InsufficientCreditError -- callers map these to HTTP errors.
    """
    slot_result = await db.execute(
        select(InterviewSlot).where(InterviewSlot.id == slot_id).with_for_update()
    )
    slot = slot_result.scalar_one_or_none()
    if slot is None or slot.status != SlotStatus.OPEN or slot.starts_at <= datetime.now(UTC):
        raise SlotUnavailableError

    if slot.interview_type == InterviewType.ROLE_SPECIFIC and not (role and role.strip()):
        raise InvalidBookingError("Please specify the role you'd like to practice for.")

    # Locks this candidate's own profile row, serializing concurrent
    # booking attempts *for this candidate only* -- the same technique
    # as app/services/resume.py's version-numbering lock. This is what
    # makes the balance check below race-safe.
    await db.execute(
        select(CandidateProfile.id).where(CandidateProfile.id == profile.id).with_for_update()
    )

    balance = await get_balance(db, profile, CreditType.MOCK_INTERVIEW)
    if balance < MOCK_INTERVIEW_CREDIT_COST:
        raise InsufficientCreditError(
            CreditType.MOCK_INTERVIEW, MOCK_INTERVIEW_CREDIT_COST, balance
        )

    mock_interview_id = uuid.uuid4()
    debit = build_debit_transaction(
        profile.id,
        CreditType.MOCK_INTERVIEW,
        -MOCK_INTERVIEW_CREDIT_COST,
        CreditTransactionReason.MOCK_INTERVIEW_BOOKING,
        reference_type="MOCK_INTERVIEW",
        reference_id=mock_interview_id,
    )
    db.add(debit)

    mock_interview = MockInterview(
        id=mock_interview_id,
        candidate_profile_id=profile.id,
        slot_id=slot.id,
        credit_transaction_id=debit.id,
        interview_type=slot.interview_type,
        role=role.strip() if role else None,
        status=InterviewStatus.BOOKED,
        scheduled_at=slot.starts_at,
    )
    db.add(mock_interview)
    slot.status = SlotStatus.BOOKED

    try:
        await db.flush()
    except IntegrityError as exc:
        # Backstop behind the row lock above: uq on mock_interviews.slot_id
        # (and .credit_transaction_id) would catch a race even if the
        # locking strategy above ever regressed.
        await db.rollback()
        raise DuplicateBookingError from exc

    await db.commit()
    await db.refresh(mock_interview)
    return mock_interview


async def complete_interview(
    db: AsyncSession,
    mock_interview: MockInterview,
    *,
    communication_score: int,
    confidence_score: int,
    technical_score: int,
    answer_structure_score: int,
    professional_presentation_score: int,
    overall_score: int,
    feedback: str,
    recommendations: list[str] | None = None,
) -> InterviewFeedback:
    """Not exposed through any candidate endpoint: there is no
    interviewer portal in this phase (PRD section 39), so this is
    called through controlled service/test/manual setup only, the same
    approach as Resume/LinkedIn's complete_review."""
    for name, score in [
        ("communication_score", communication_score),
        ("confidence_score", confidence_score),
        ("technical_score", technical_score),
        ("answer_structure_score", answer_structure_score),
        ("professional_presentation_score", professional_presentation_score),
    ]:
        if not 0 <= score <= 10:
            raise ValueError(f"{name} must be between 0 and 10")
    if not 0 <= overall_score <= 100:
        raise ValueError("overall_score must be between 0 and 100")

    result = InterviewFeedback(
        mock_interview_id=mock_interview.id,
        communication_score=communication_score,
        confidence_score=confidence_score,
        technical_score=technical_score,
        answer_structure_score=answer_structure_score,
        professional_presentation_score=professional_presentation_score,
        overall_score=overall_score,
        feedback=feedback,
        recommendations=recommendations or [],
    )
    db.add(result)
    mock_interview.status = InterviewStatus.COMPLETED

    await db.commit()
    await db.refresh(result)
    return result
