import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.core.event import EventStatus, EventType, InvalidEventDatesError
from app.core.mock_interview import InterviewStatus, InterviewType
from app.core.review import ReviewerType, ReviewRequestStatus
from app.db.session import get_db
from app.models.user import User
from app.schemas.admin import (
    AdminDashboardResponse,
    AdminEventItem,
    AdminInterviewSlotRead,
    Candidate360Response,
    CandidateListItem,
    CompleteInterviewRequest,
    CompleteReviewRequest,
    CreateSlotRequest,
    CreditGrantTransaction,
    EventRegistrationAdminItem,
    GrantCreditRequest,
    LinkedInReviewQueueItem,
    MockInterviewAdminItem,
    Page,
    ResumeReviewQueueItem,
)
from app.schemas.credits import CreditTransactionRead
from app.schemas.event import CreateEventRequest, UpdateEventRequest
from app.schemas.linkedin import LinkedInReviewRequestRead
from app.schemas.mock_interview import InterviewFeedbackRead, MockInterviewRead
from app.schemas.resume import ReviewRequestRead
from app.services import admin as admin_service
from app.services import credits as credits_service
from app.services import event as event_service
from app.services import linkedin_review as linkedin_review_service
from app.services import mock_interview as mock_interview_service
from app.services import notification as notification_service
from app.services import resume_review as resume_review_service

router = APIRouter(prefix="/admin", tags=["admin"])

# Reused as the default for every paginated list route below, since
# FastAPI Query() instances are just descriptors -- fine to share.
_PAGE = Query(default=1, ge=1)
_PAGE_SIZE = Query(default=admin_service.DEFAULT_PAGE_SIZE, ge=1, le=admin_service.MAX_PAGE_SIZE)


# --- Dashboard -----------------------------------------------------------


@router.get("/dashboard", response_model=AdminDashboardResponse)
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> AdminDashboardResponse:
    return await admin_service.get_dashboard(db)


# --- Candidates -----------------------------------------------------------


@router.get("/candidates", response_model=Page[CandidateListItem])
async def list_candidates(
    page: int = _PAGE,
    page_size: int = _PAGE_SIZE,
    search: str | None = Query(default=None, max_length=200),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> Page[CandidateListItem]:
    return await admin_service.list_candidates(db, page=page, page_size=page_size, search=search)


@router.get("/candidates/{candidate_id}", response_model=Candidate360Response)
async def get_candidate_360(
    candidate_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> Candidate360Response:
    result = await admin_service.get_candidate_360(db, candidate_id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
    return result


# --- Resume reviews ---------------------------------------------------


@router.get("/resume-reviews", response_model=Page[ResumeReviewQueueItem])
async def list_resume_reviews(
    review_status: ReviewRequestStatus | None = Query(default=None, alias="status"),
    page: int = _PAGE,
    page_size: int = _PAGE_SIZE,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> Page[ResumeReviewQueueItem]:
    return await admin_service.list_resume_reviews(
        db, status_filter=review_status, page=page, page_size=page_size
    )


async def _get_resume_review_or_404(db: AsyncSession, review_id: uuid.UUID):
    review = await admin_service.get_resume_review_by_id(db, review_id)
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    return review


@router.get("/resume-reviews/{review_id}", response_model=ResumeReviewQueueItem)
async def get_resume_review(
    review_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> ResumeReviewQueueItem:
    review = await _get_resume_review_or_404(db, review_id)
    return admin_service.build_resume_review_item(review)


@router.post("/resume-reviews/{review_id}/start", response_model=ReviewRequestRead)
async def start_resume_review(
    review_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> ReviewRequestRead:
    review = await _get_resume_review_or_404(db, review_id)
    if review.status != ReviewRequestStatus.REQUESTED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only a requested review can be started",
        )
    updated = await resume_review_service.start_review(db, review)
    return ReviewRequestRead.model_validate(updated)


@router.post("/resume-reviews/{review_id}/complete", response_model=ReviewRequestRead)
async def complete_resume_review(
    review_id: uuid.UUID,
    payload: CompleteReviewRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> ReviewRequestRead:
    review = await _get_resume_review_or_404(db, review_id)
    if review.status == ReviewRequestStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Review is already completed"
        )

    # reviewer_type is always HUMAN here, never client-supplied: there
    # is no AI provider integration in this phase (PRD section 21).
    await resume_review_service.complete_review(
        db,
        review,
        summary=payload.summary,
        reviewer_type=ReviewerType.HUMAN,
        score=payload.score,
        strengths=payload.strengths,
        improvements=payload.improvements,
        recommendations=payload.recommendations,
    )
    # Completion already succeeded and committed above; a notification
    # failure must never surface as a completion failure (see
    # notification_service.create_notification_safe). The 409 guard
    # above also means this can only ever fire once per review.
    await notification_service.notify_resume_review_completed(
        db, review.candidate_profile.user_id
    )
    refreshed = await _get_resume_review_or_404(db, review_id)
    return ReviewRequestRead.model_validate(refreshed)


# --- LinkedIn reviews -------------------------------------------------


@router.get("/linkedin-reviews", response_model=Page[LinkedInReviewQueueItem])
async def list_linkedin_reviews(
    review_status: ReviewRequestStatus | None = Query(default=None, alias="status"),
    page: int = _PAGE,
    page_size: int = _PAGE_SIZE,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> Page[LinkedInReviewQueueItem]:
    return await admin_service.list_linkedin_reviews(
        db, status_filter=review_status, page=page, page_size=page_size
    )


async def _get_linkedin_review_or_404(db: AsyncSession, review_id: uuid.UUID):
    review = await admin_service.get_linkedin_review_by_id(db, review_id)
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    return review


@router.get("/linkedin-reviews/{review_id}", response_model=LinkedInReviewQueueItem)
async def get_linkedin_review(
    review_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> LinkedInReviewQueueItem:
    review = await _get_linkedin_review_or_404(db, review_id)
    return admin_service.build_linkedin_review_item(review)


@router.post("/linkedin-reviews/{review_id}/start", response_model=LinkedInReviewRequestRead)
async def start_linkedin_review(
    review_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> LinkedInReviewRequestRead:
    review = await _get_linkedin_review_or_404(db, review_id)
    if review.status != ReviewRequestStatus.REQUESTED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only a requested review can be started",
        )
    updated = await linkedin_review_service.start_review(db, review)
    return LinkedInReviewRequestRead.model_validate(updated)


@router.post("/linkedin-reviews/{review_id}/complete", response_model=LinkedInReviewRequestRead)
async def complete_linkedin_review(
    review_id: uuid.UUID,
    payload: CompleteReviewRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> LinkedInReviewRequestRead:
    review = await _get_linkedin_review_or_404(db, review_id)
    if review.status == ReviewRequestStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Review is already completed"
        )

    await linkedin_review_service.complete_review(
        db,
        review,
        summary=payload.summary,
        reviewer_type=ReviewerType.HUMAN,
        score=payload.score,
        strengths=payload.strengths,
        improvements=payload.improvements,
        recommendations=payload.recommendations,
    )
    # Same rationale as complete_resume_review above.
    await notification_service.notify_linkedin_review_completed(
        db, review.candidate_profile.user_id
    )
    refreshed = await _get_linkedin_review_or_404(db, review_id)
    return LinkedInReviewRequestRead.model_validate(refreshed)


# --- Mock interviews / slots -----------------------------------------------


@router.get("/mock-interviews", response_model=Page[MockInterviewAdminItem])
async def list_mock_interviews(
    interview_status: InterviewStatus | None = Query(default=None, alias="status"),
    interview_type: InterviewType | None = Query(default=None),
    page: int = _PAGE,
    page_size: int = _PAGE_SIZE,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> Page[MockInterviewAdminItem]:
    return await admin_service.list_mock_interviews(
        db,
        status_filter=interview_status,
        interview_type_filter=interview_type,
        page=page,
        page_size=page_size,
    )


@router.get("/mock-interviews/slots", response_model=Page[AdminInterviewSlotRead])
async def list_slots(
    interview_type: InterviewType | None = Query(default=None),
    page: int = _PAGE,
    page_size: int = _PAGE_SIZE,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> Page[AdminInterviewSlotRead]:
    return await admin_service.list_slots(
        db, interview_type_filter=interview_type, page=page, page_size=page_size
    )


@router.post(
    "/mock-interviews/slots",
    response_model=AdminInterviewSlotRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_slot(
    payload: CreateSlotRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> AdminInterviewSlotRead:
    slot = await mock_interview_service.create_slot(
        db, payload.interview_type, payload.starts_at, payload.ends_at
    )
    return AdminInterviewSlotRead.model_validate(slot)


@router.get("/mock-interviews/{interview_id}", response_model=MockInterviewAdminItem)
async def get_mock_interview(
    interview_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> MockInterviewAdminItem:
    interview = await admin_service.get_mock_interview_by_id(db, interview_id)
    if interview is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    return MockInterviewAdminItem(
        interview=MockInterviewRead.model_validate(interview),
        candidate=admin_service.candidate_summary(
            interview.candidate_profile, interview.candidate_profile.user
        ),
    )


@router.post("/mock-interviews/{interview_id}/complete", response_model=InterviewFeedbackRead)
async def complete_mock_interview(
    interview_id: uuid.UUID,
    payload: CompleteInterviewRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> InterviewFeedbackRead:
    interview = await admin_service.get_mock_interview_by_id(db, interview_id)
    if interview is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    if interview.status != InterviewStatus.BOOKED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only a booked interview can be completed",
        )

    try:
        feedback = await mock_interview_service.complete_interview(
            db,
            interview,
            communication_score=payload.communication_score,
            confidence_score=payload.confidence_score,
            technical_score=payload.technical_score,
            answer_structure_score=payload.answer_structure_score,
            professional_presentation_score=payload.professional_presentation_score,
            overall_score=payload.overall_score,
            feedback=payload.feedback,
            recommendations=payload.recommendations,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)
        ) from exc

    return InterviewFeedbackRead.model_validate(feedback)


# --- Events -----------------------------------------------------------


@router.get("/events", response_model=Page[AdminEventItem])
async def list_events(
    event_status: EventStatus | None = Query(default=None, alias="status"),
    event_type: EventType | None = Query(default=None),
    page: int = _PAGE,
    page_size: int = _PAGE_SIZE,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> Page[AdminEventItem]:
    return await admin_service.list_events(
        db,
        status_filter=event_status,
        event_type_filter=event_type,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/events", response_model=AdminEventItem, status_code=status.HTTP_201_CREATED
)
async def create_event(
    payload: CreateEventRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> AdminEventItem:
    try:
        event = await event_service.create_event(
            db,
            title=payload.title,
            description=payload.description,
            event_type=payload.event_type,
            starts_at=payload.starts_at,
            ends_at=payload.ends_at,
            timezone=payload.timezone,
            location=payload.location,
            meeting_url=payload.meeting_url,
            status=payload.status,
        )
    except InvalidEventDatesError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=exc.message
        ) from exc

    item = await admin_service.get_event_admin_item(db, event.id)
    assert item is not None
    return item


async def _get_event_admin_item_or_404(db: AsyncSession, event_id: uuid.UUID) -> AdminEventItem:
    item = await admin_service.get_event_admin_item(db, event_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return item


@router.get("/events/{event_id}", response_model=AdminEventItem)
async def get_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> AdminEventItem:
    return await _get_event_admin_item_or_404(db, event_id)


@router.patch("/events/{event_id}", response_model=AdminEventItem)
async def update_event(
    event_id: uuid.UUID,
    payload: UpdateEventRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> AdminEventItem:
    event = await event_service.get_event_by_id(db, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    try:
        await event_service.update_event(db, event, **payload.model_dump(exclude_unset=True))
    except InvalidEventDatesError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=exc.message
        ) from exc

    return await _get_event_admin_item_or_404(db, event_id)


@router.post("/events/{event_id}/publish", response_model=AdminEventItem)
async def publish_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> AdminEventItem:
    event = await event_service.get_event_by_id(db, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    if event.status not in (EventStatus.DRAFT, EventStatus.PUBLISHED):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only a draft event can be published",
        )
    # Captured before the transition: only a genuine DRAFT -> PUBLISHED
    # move represents the event becoming newly available. Re-publishing
    # an already-PUBLISHED event (this route's own idempotent no-op path)
    # must not notify every candidate again.
    was_draft = event.status == EventStatus.DRAFT
    await event_service.set_event_status(db, event, EventStatus.PUBLISHED)

    # Fire-and-forget: publication already succeeded and committed above,
    # so a notification failure here must never surface as a publish
    # failure (see notification_service.notify_event_published_bulk).
    if was_draft:
        recipient_ids = await notification_service.get_active_candidate_user_ids(db)
        await notification_service.notify_event_published_bulk(
            db, recipient_ids, event_id=event.id, event_title=event.title
        )

    return await _get_event_admin_item_or_404(db, event_id)


@router.post("/events/{event_id}/unpublish", response_model=AdminEventItem)
async def unpublish_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> AdminEventItem:
    event = await event_service.get_event_by_id(db, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    if event.status != EventStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only a published event can be unpublished",
        )
    await event_service.set_event_status(db, event, EventStatus.DRAFT)
    return await _get_event_admin_item_or_404(db, event_id)


@router.post("/events/{event_id}/cancel", response_model=AdminEventItem)
async def cancel_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> AdminEventItem:
    event = await event_service.get_event_by_id(db, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    if event.status == EventStatus.CANCELLED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Event already cancelled")
    await event_service.set_event_status(db, event, EventStatus.CANCELLED)
    return await _get_event_admin_item_or_404(db, event_id)


@router.get(
    "/events/{event_id}/registrations", response_model=Page[EventRegistrationAdminItem]
)
async def list_event_registrations(
    event_id: uuid.UUID,
    page: int = _PAGE,
    page_size: int = _PAGE_SIZE,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> Page[EventRegistrationAdminItem]:
    event = await event_service.get_event_by_id(db, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return await admin_service.list_event_registrations(
        db, event_id, page=page, page_size=page_size
    )


# --- Credits ---------------------------------------------------------------


@router.post(
    "/credits/grant", response_model=CreditTransactionRead, status_code=status.HTTP_201_CREATED
)
async def grant_credit(
    payload: GrantCreditRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> CreditTransactionRead:
    profile = await admin_service.get_candidate_profile_by_id(db, payload.candidate_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

    try:
        transaction = await credits_service.grant_credit(
            db,
            profile,
            payload.credit_type,
            payload.amount,
            payload.reason,
            description=payload.description,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)
        ) from exc

    return CreditTransactionRead.model_validate(transaction)


@router.get("/credits/transactions", response_model=Page[CreditGrantTransaction])
async def list_credit_transactions(
    page: int = _PAGE,
    page_size: int = _PAGE_SIZE,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> Page[CreditGrantTransaction]:
    return await admin_service.list_credit_transactions(db, page=page, page_size=page_size)
