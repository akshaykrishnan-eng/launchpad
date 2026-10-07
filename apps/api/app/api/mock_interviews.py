import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_candidate_profile
from app.core.credits import InsufficientCreditError
from app.core.mock_interview import InterviewType, InvalidBookingError, SlotUnavailableError
from app.db.session import get_db
from app.models.candidate_profile import CandidateProfile
from app.models.mock_interview import MockInterview
from app.schemas.mock_interview import (
    BookInterviewRequest,
    InterviewFeedbackRead,
    InterviewSlotRead,
    MockInterviewRead,
)
from app.services import mock_interview as mock_interview_service
from app.services import notification as notification_service

router = APIRouter(prefix="/candidate/mock-interviews", tags=["mock-interviews"])


def _to_read(interview: MockInterview) -> MockInterviewRead:
    return MockInterviewRead.model_validate(interview)


async def _get_owned_interview_or_404(
    db: AsyncSession, profile: CandidateProfile, interview_id: uuid.UUID
) -> MockInterview:
    interview = await mock_interview_service.get_owned_interview(db, profile, interview_id)
    if interview is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    return interview


@router.get("/slots", response_model=list[InterviewSlotRead])
async def list_available_slots(
    interview_type: InterviewType | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _profile: CandidateProfile = Depends(get_current_candidate_profile),
) -> list[InterviewSlotRead]:
    slots = await mock_interview_service.list_available_slots(db, interview_type)
    return [InterviewSlotRead.model_validate(s) for s in slots]


@router.post("/book", response_model=MockInterviewRead, status_code=status.HTTP_201_CREATED)
async def book_interview(
    body: BookInterviewRequest,
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> MockInterviewRead:
    try:
        interview = await mock_interview_service.book_interview(
            db, profile, body.slot_id, role=body.role
        )
    except SlotUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This slot is no longer available. Please choose another.",
        ) from exc
    except InvalidBookingError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=exc.message
        ) from exc
    except InsufficientCreditError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"You don't have enough {exc.credit_type.value.replace('_', ' ').title()} "
                f"credits. Required: {exc.required}, available: {exc.available}."
            ),
        ) from exc
    except mock_interview_service.DuplicateBookingError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This slot is no longer available. Please choose another.",
        ) from exc

    # Booking already succeeded and committed above; a notification
    # failure must never surface as a booking failure (see
    # notification_service.create_notification_safe).
    await notification_service.notify_mock_interview_booked(
        db, profile.user_id, interview.interview_type, interview.scheduled_at
    )

    # feedback relationship is never loaded on a freshly booked
    # interview, and is always None for one this new anyway.
    return MockInterviewRead(
        id=interview.id,
        interview_type=interview.interview_type,
        role=interview.role,
        status=interview.status,
        scheduled_at=interview.scheduled_at,
        created_at=interview.created_at,
        feedback=None,
    )


@router.get("", response_model=list[MockInterviewRead])
async def list_interviews(
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> list[MockInterviewRead]:
    interviews = await mock_interview_service.list_interviews(db, profile)
    return [_to_read(i) for i in interviews]


@router.get("/{interview_id}", response_model=MockInterviewRead)
async def get_interview(
    interview_id: uuid.UUID,
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> MockInterviewRead:
    interview = await _get_owned_interview_or_404(db, profile, interview_id)
    return _to_read(interview)


@router.get("/{interview_id}/feedback", response_model=InterviewFeedbackRead | None)
async def get_interview_feedback(
    interview_id: uuid.UUID,
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> InterviewFeedbackRead | None:
    interview = await _get_owned_interview_or_404(db, profile, interview_id)
    if interview.feedback is None:
        return None
    return InterviewFeedbackRead.model_validate(interview.feedback)
