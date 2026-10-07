import uuid
from datetime import UTC, datetime

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.credits import CreditType
from app.core.event import EventStatus, EventType
from app.core.mock_interview import InterviewStatus, InterviewType
from app.core.review import ReviewRequestStatus
from app.models.candidate_profile import CandidateProfile
from app.models.candidate_skill import CandidateSkill
from app.models.career_preference import CareerPreference
from app.models.credit_transaction import CreditTransaction
from app.models.education import Education
from app.models.event import Event
from app.models.event_registration import EventRegistration
from app.models.interview_slot import InterviewSlot
from app.models.linkedin_review_request import LinkedInReviewRequest
from app.models.mock_interview import MockInterview
from app.models.review_request import ReviewRequest
from app.models.user import User
from app.models.work_experience import WorkExperience
from app.schemas.admin import (
    AdminCandidateIdentity,
    AdminDashboardMetrics,
    AdminDashboardResponse,
    AdminEventItem,
    AdminInterviewSlotRead,
    Candidate360Response,
    CandidateListItem,
    CandidateSummary,
    CreditGrantTransaction,
    EventRegistrationAdminItem,
    LinkedInReviewQueueItem,
    MockInterviewAdminItem,
    Page,
    RecentCandidate,
    ResumeReviewQueueItem,
)
from app.schemas.candidate import (
    CandidateSkillRead,
    CareerPreferenceRead,
    EducationRead,
    WorkExperienceRead,
)
from app.schemas.credits import CreditBalanceRead, CreditTransactionRead
from app.schemas.linkedin import LinkedInProfileRead, LinkedInReviewRequestRead
from app.schemas.mock_interview import MockInterviewRead
from app.schemas.resume import ReviewRequestRead
from app.services.candidate_profile import build_profile_read
from app.services.career_preferences import get_or_create_preference
from app.services.credits import get_all_balances
from app.services.education import list_education
from app.services.linkedin import get_profile as get_linkedin_profile
from app.services.linkedin_review import get_latest_review as get_latest_linkedin_review
from app.services.mock_interview import list_interviews
from app.services.profile_completion import CompletionInput, calculate_profile_completion_breakdown
from app.services.resume import get_latest_version, list_resumes, to_resume_read
from app.services.resume_review import get_latest_review as get_latest_resume_review
from app.services.skills import list_candidate_skills
from app.services.work_experience import list_experience

MAX_PAGE_SIZE = 50
DEFAULT_PAGE_SIZE = 20


def _clamp_page_size(page_size: int) -> int:
    return max(1, min(page_size, MAX_PAGE_SIZE))


async def _count(db: AsyncSession, query, id_column) -> int:
    """COUNT(*) over an already-filtered select, reusing its FROM/JOIN/
    WHERE clauses rather than re-stating the filter -- used by every
    paginated list below."""
    subquery = query.with_only_columns(id_column).subquery()
    result = await db.execute(select(func.count()).select_from(subquery))
    return result.scalar_one()


def candidate_summary(profile: CandidateProfile, user: User) -> CandidateSummary:
    return CandidateSummary(
        id=profile.id, email=user.email, first_name=profile.first_name, last_name=profile.last_name
    )


# --- Candidate list (bulk, N+1-safe) ---------------------------------------


async def list_candidates(
    db: AsyncSession, *, page: int, page_size: int, search: str | None
) -> Page[CandidateListItem]:
    page = max(1, page)
    page_size = _clamp_page_size(page_size)

    query = select(CandidateProfile, User).join(User, User.id == CandidateProfile.user_id)
    if search:
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                User.email.ilike(term),
                CandidateProfile.first_name.ilike(term),
                CandidateProfile.last_name.ilike(term),
            )
        )

    total = await _count(db, query, CandidateProfile.id)

    rows = (
        await db.execute(
            query.order_by(CandidateProfile.created_at.desc())
            .limit(page_size)
            .offset((page - 1) * page_size)
        )
    ).all()

    profile_ids = [profile.id for profile, _ in rows]

    # Bulk-fetched once for the whole page, not once per row: this is
    # what keeps the list N+1-safe while still running every row
    # through the exact same calculate_profile_completion_breakdown
    # pure function Phase 3/4 already use (see
    # app/services/candidate_profile.py -- that function still owns the
    # single source of truth for the weighting formula).
    education_counts = dict(
        (
            await db.execute(
                select(Education.candidate_profile_id, func.count())
                .where(Education.candidate_profile_id.in_(profile_ids))
                .group_by(Education.candidate_profile_id)
            )
        ).all()
    )
    skill_counts = dict(
        (
            await db.execute(
                select(CandidateSkill.candidate_profile_id, func.count())
                .where(CandidateSkill.candidate_profile_id.in_(profile_ids))
                .group_by(CandidateSkill.candidate_profile_id)
            )
        ).all()
    )
    experience_counts = dict(
        (
            await db.execute(
                select(WorkExperience.candidate_profile_id, func.count())
                .where(WorkExperience.candidate_profile_id.in_(profile_ids))
                .group_by(WorkExperience.candidate_profile_id)
            )
        ).all()
    )
    preferences = {
        pref.candidate_profile_id: pref
        for pref in (
            await db.execute(
                select(CareerPreference).where(
                    CareerPreference.candidate_profile_id.in_(profile_ids)
                )
            )
        ).scalars()
    }

    items = []
    for profile, user in rows:
        breakdown = calculate_profile_completion_breakdown(
            CompletionInput(
                profile=profile,
                education_count=education_counts.get(profile.id, 0),
                skill_count=skill_counts.get(profile.id, 0),
                experience_count=experience_counts.get(profile.id, 0),
                career_preference=preferences.get(profile.id),
            )
        )
        items.append(
            CandidateListItem(
                id=profile.id,
                email=user.email,
                first_name=profile.first_name,
                last_name=profile.last_name,
                current_status=profile.current_status,
                completion_percentage=breakdown.percentage,
                created_at=profile.created_at,
            )
        )

    return Page(items=items, total=total, page=page, page_size=page_size)


# --- Candidate 360 -----------------------------------------------------


async def get_candidate_360(
    db: AsyncSession, candidate_id: uuid.UUID
) -> Candidate360Response | None:
    row = (
        await db.execute(
            select(CandidateProfile, User)
            .join(User, User.id == CandidateProfile.user_id)
            .where(CandidateProfile.id == candidate_id)
        )
    ).first()
    if row is None:
        return None
    profile, user = row

    # Every one of these reuses the exact Phase 3/5/6/7 domain service
    # function a candidate's own pages call -- no business logic is
    # re-implemented here, only composed (PRD section 17/31).
    education = await list_education(db, profile)
    candidate_skills = await list_candidate_skills(db, profile)
    experience = await list_experience(db, profile)
    preference = await get_or_create_preference(db, profile)
    profile_read = await build_profile_read(db, profile)

    # list_resumes orders by version descending, so the first row (if
    # any) is always the latest -- same assumption resume.py's own
    # list/get endpoints make.
    resumes = await list_resumes(db, profile)
    latest_resume = resumes[0] if resumes else None
    resume_read = None
    resume_review_read = None
    if latest_resume is not None:
        latest_version = await get_latest_version(db, profile)
        resume_read = to_resume_read(latest_resume, latest_version)
        review_request = await get_latest_resume_review(db, latest_resume)
        if review_request is not None:
            resume_review_read = ReviewRequestRead.model_validate(review_request)

    linkedin_profile = await get_linkedin_profile(db, profile)
    linkedin_read = None
    linkedin_review_read = None
    if linkedin_profile is not None:
        linkedin_read = LinkedInProfileRead.model_validate(linkedin_profile)
        li_review = await get_latest_linkedin_review(db, linkedin_profile)
        if li_review is not None:
            linkedin_review_read = LinkedInReviewRequestRead.model_validate(li_review)

    interviews = await list_interviews(db, profile)
    balances = await get_all_balances(db, profile)

    return Candidate360Response(
        candidate=AdminCandidateIdentity(
            id=profile.id,
            user_id=user.id,
            email=user.email,
            is_active=user.is_active,
            created_at=user.created_at,
            last_login_at=user.last_login_at,
        ),
        profile=profile_read,
        education=[EducationRead.model_validate(e) for e in education],
        skills=[CandidateSkillRead(id=cs.id, name=cs.skill.name) for cs in candidate_skills],
        experience=[WorkExperienceRead.model_validate(e) for e in experience],
        career_preferences=CareerPreferenceRead.model_validate(preference),
        resume=resume_read,
        resume_review=resume_review_read,
        linkedin=linkedin_read,
        linkedin_review=linkedin_review_read,
        interviews=[MockInterviewRead.model_validate(i) for i in interviews],
        credits=[
            CreditBalanceRead(credit_type=credit_type.value, balance=balances[credit_type])
            for credit_type in CreditType
        ],
    )


async def get_candidate_profile_by_id(
    db: AsyncSession, candidate_id: uuid.UUID
) -> CandidateProfile | None:
    return (
        await db.execute(select(CandidateProfile).where(CandidateProfile.id == candidate_id))
    ).scalar_one_or_none()


# --- Resume review queue ----------------------------------------------


async def list_resume_reviews(
    db: AsyncSession, *, status_filter: ReviewRequestStatus | None, page: int, page_size: int
) -> Page[ResumeReviewQueueItem]:
    page = max(1, page)
    page_size = _clamp_page_size(page_size)

    query = select(ReviewRequest).options(
        selectinload(ReviewRequest.result),
        selectinload(ReviewRequest.resume),
        selectinload(ReviewRequest.candidate_profile).selectinload(CandidateProfile.user),
    )
    if status_filter is not None:
        query = query.where(ReviewRequest.status == status_filter)

    total = await _count(db, query, ReviewRequest.id)

    rows = (
        await db.execute(
            query.order_by(ReviewRequest.requested_at.desc())
            .limit(page_size)
            .offset((page - 1) * page_size)
        )
    ).scalars()

    items = [build_resume_review_item(r) for r in rows]
    return Page(items=items, total=total, page=page, page_size=page_size)


def build_resume_review_item(review_request: ReviewRequest) -> ResumeReviewQueueItem:
    profile = review_request.candidate_profile
    return ResumeReviewQueueItem(
        review=ReviewRequestRead.model_validate(review_request),
        candidate=candidate_summary(profile, profile.user),
        resume_version=review_request.resume.version,
        resume_filename=review_request.resume.original_filename,
    )


async def get_resume_review_by_id(db: AsyncSession, review_id: uuid.UUID) -> ReviewRequest | None:
    return (
        await db.execute(
            select(ReviewRequest)
            .options(
                selectinload(ReviewRequest.result),
                selectinload(ReviewRequest.resume),
                selectinload(ReviewRequest.candidate_profile).selectinload(CandidateProfile.user),
            )
            .where(ReviewRequest.id == review_id)
        )
    ).scalar_one_or_none()


# --- LinkedIn review queue -----------------------------------------------


async def list_linkedin_reviews(
    db: AsyncSession, *, status_filter: ReviewRequestStatus | None, page: int, page_size: int
) -> Page[LinkedInReviewQueueItem]:
    page = max(1, page)
    page_size = _clamp_page_size(page_size)

    query = select(LinkedInReviewRequest).options(
        selectinload(LinkedInReviewRequest.result),
        selectinload(LinkedInReviewRequest.candidate_profile).selectinload(CandidateProfile.user),
    )
    if status_filter is not None:
        query = query.where(LinkedInReviewRequest.status == status_filter)

    total = await _count(db, query, LinkedInReviewRequest.id)

    rows = (
        await db.execute(
            query.order_by(LinkedInReviewRequest.requested_at.desc())
            .limit(page_size)
            .offset((page - 1) * page_size)
        )
    ).scalars()

    items = [build_linkedin_review_item(r) for r in rows]
    return Page(items=items, total=total, page=page, page_size=page_size)


def build_linkedin_review_item(review_request: LinkedInReviewRequest) -> LinkedInReviewQueueItem:
    profile = review_request.candidate_profile
    return LinkedInReviewQueueItem(
        review=LinkedInReviewRequestRead.model_validate(review_request),
        candidate=candidate_summary(profile, profile.user),
    )


async def get_linkedin_review_by_id(
    db: AsyncSession, review_id: uuid.UUID
) -> LinkedInReviewRequest | None:
    return (
        await db.execute(
            select(LinkedInReviewRequest)
            .options(
                selectinload(LinkedInReviewRequest.result),
                selectinload(LinkedInReviewRequest.candidate_profile).selectinload(
                    CandidateProfile.user
                ),
            )
            .where(LinkedInReviewRequest.id == review_id)
        )
    ).scalar_one_or_none()


# --- Mock interviews / slots -----------------------------------------------


async def list_mock_interviews(
    db: AsyncSession,
    *,
    status_filter: InterviewStatus | None,
    interview_type_filter: InterviewType | None,
    page: int,
    page_size: int,
) -> Page[MockInterviewAdminItem]:
    page = max(1, page)
    page_size = _clamp_page_size(page_size)

    query = select(MockInterview).options(
        selectinload(MockInterview.feedback),
        selectinload(MockInterview.candidate_profile).selectinload(CandidateProfile.user),
    )
    if status_filter is not None:
        query = query.where(MockInterview.status == status_filter)
    if interview_type_filter is not None:
        query = query.where(MockInterview.interview_type == interview_type_filter)

    total = await _count(db, query, MockInterview.id)

    rows = (
        await db.execute(
            query.order_by(MockInterview.scheduled_at.desc())
            .limit(page_size)
            .offset((page - 1) * page_size)
        )
    ).scalars()

    items = [
        MockInterviewAdminItem(
            interview=MockInterviewRead.model_validate(i),
            candidate=candidate_summary(i.candidate_profile, i.candidate_profile.user),
        )
        for i in rows
    ]
    return Page(items=items, total=total, page=page, page_size=page_size)


async def get_mock_interview_by_id(
    db: AsyncSession, interview_id: uuid.UUID
) -> MockInterview | None:
    return (
        await db.execute(
            select(MockInterview)
            .options(
                selectinload(MockInterview.feedback),
                selectinload(MockInterview.candidate_profile).selectinload(CandidateProfile.user),
            )
            .where(MockInterview.id == interview_id)
        )
    ).scalar_one_or_none()


async def list_slots(
    db: AsyncSession, *, interview_type_filter: InterviewType | None, page: int, page_size: int
) -> Page[AdminInterviewSlotRead]:
    """Unlike the candidate-facing list_available_slots, this is
    deliberately not filtered to OPEN/future-only -- an admin needs to
    see booked and past slots too."""
    page = max(1, page)
    page_size = _clamp_page_size(page_size)

    query = select(InterviewSlot)
    if interview_type_filter is not None:
        query = query.where(InterviewSlot.interview_type == interview_type_filter)

    total = await _count(db, query, InterviewSlot.id)

    rows = (
        await db.execute(
            query.order_by(InterviewSlot.starts_at.desc())
            .limit(page_size)
            .offset((page - 1) * page_size)
        )
    ).scalars()

    items = [AdminInterviewSlotRead.model_validate(slot) for slot in rows]
    return Page(items=items, total=total, page=page, page_size=page_size)


# --- Credits ----------------------------------------------------------


async def list_credit_transactions(
    db: AsyncSession, *, page: int, page_size: int
) -> Page[CreditGrantTransaction]:
    page = max(1, page)
    page_size = _clamp_page_size(page_size)

    query = select(CreditTransaction).options(
        selectinload(CreditTransaction.candidate_profile).selectinload(CandidateProfile.user)
    )

    total = await _count(db, query, CreditTransaction.id)

    rows = (
        await db.execute(
            query.order_by(CreditTransaction.created_at.desc())
            .limit(page_size)
            .offset((page - 1) * page_size)
        )
    ).scalars()

    items = [
        CreditGrantTransaction(
            transaction=CreditTransactionRead.model_validate(t),
            candidate=candidate_summary(t.candidate_profile, t.candidate_profile.user),
        )
        for t in rows
    ]
    return Page(items=items, total=total, page=page, page_size=page_size)


# --- Dashboard ----------------------------------------------------------


async def get_dashboard(db: AsyncSession) -> AdminDashboardResponse:
    total_candidates = (
        await db.execute(select(func.count()).select_from(CandidateProfile))
    ).scalar_one()
    pending_resume_reviews = (
        await db.execute(
            select(func.count())
            .select_from(ReviewRequest)
            .where(ReviewRequest.status != ReviewRequestStatus.COMPLETED)
        )
    ).scalar_one()
    pending_linkedin_reviews = (
        await db.execute(
            select(func.count())
            .select_from(LinkedInReviewRequest)
            .where(LinkedInReviewRequest.status != ReviewRequestStatus.COMPLETED)
        )
    ).scalar_one()
    upcoming_interviews = (
        await db.execute(
            select(func.count())
            .select_from(MockInterview)
            .where(
                MockInterview.status == InterviewStatus.BOOKED,
                MockInterview.scheduled_at > datetime.now(UTC),
            )
        )
    ).scalar_one()
    completed_interviews = (
        await db.execute(
            select(func.count())
            .select_from(MockInterview)
            .where(MockInterview.status == InterviewStatus.COMPLETED)
        )
    ).scalar_one()
    total_credit_transactions = (
        await db.execute(select(func.count()).select_from(CreditTransaction))
    ).scalar_one()

    recent_candidates_rows = (
        await db.execute(
            select(CandidateProfile, User)
            .join(User, User.id == CandidateProfile.user_id)
            .order_by(CandidateProfile.created_at.desc())
            .limit(5)
        )
    ).all()
    recent_candidates = [
        RecentCandidate(
            id=profile.id,
            email=user.email,
            first_name=profile.first_name,
            last_name=profile.last_name,
            created_at=profile.created_at,
        )
        for profile, user in recent_candidates_rows
    ]

    recent_resume_reviews = (
        await list_resume_reviews(db, status_filter=None, page=1, page_size=5)
    ).items
    recent_linkedin_reviews = (
        await list_linkedin_reviews(db, status_filter=None, page=1, page_size=5)
    ).items

    return AdminDashboardResponse(
        metrics=AdminDashboardMetrics(
            total_candidates=total_candidates,
            pending_resume_reviews=pending_resume_reviews,
            pending_linkedin_reviews=pending_linkedin_reviews,
            upcoming_interviews=upcoming_interviews,
            completed_interviews=completed_interviews,
            total_credit_transactions=total_credit_transactions,
        ),
        recent_candidates=recent_candidates,
        recent_resume_reviews=recent_resume_reviews,
        recent_linkedin_reviews=recent_linkedin_reviews,
    )


# --- Events ------------------------------------------------------------


def _event_registration_counts_subquery():
    return (
        select(EventRegistration.event_id, func.count().label("count"))
        .group_by(EventRegistration.event_id)
        .subquery()
    )


async def list_events(
    db: AsyncSession,
    *,
    status_filter: EventStatus | None,
    event_type_filter: EventType | None,
    page: int,
    page_size: int,
) -> Page[AdminEventItem]:
    page = max(1, page)
    page_size = _clamp_page_size(page_size)

    counts = _event_registration_counts_subquery()
    query = select(Event, counts.c.count).outerjoin(counts, counts.c.event_id == Event.id)
    if status_filter is not None:
        query = query.where(Event.status == status_filter)
    if event_type_filter is not None:
        query = query.where(Event.event_type == event_type_filter)

    total = await _count(db, query, Event.id)

    rows = await db.execute(
        query.order_by(Event.starts_at.desc()).limit(page_size).offset((page - 1) * page_size)
    )

    items = [
        AdminEventItem(
            id=event.id,
            title=event.title,
            description=event.description,
            event_type=EventType(event.event_type),
            status=EventStatus(event.status),
            starts_at=event.starts_at,
            ends_at=event.ends_at,
            timezone=event.timezone,
            location=event.location,
            meeting_url=event.meeting_url,
            registration_count=count or 0,
        )
        for event, count in rows.all()
    ]
    return Page(items=items, total=total, page=page, page_size=page_size)


async def get_event_admin_item(db: AsyncSession, event_id: uuid.UUID) -> AdminEventItem | None:
    counts = _event_registration_counts_subquery()
    result = await db.execute(
        select(Event, counts.c.count)
        .outerjoin(counts, counts.c.event_id == Event.id)
        .where(Event.id == event_id)
    )
    row = result.first()
    if row is None:
        return None
    event, count = row
    return AdminEventItem(
        id=event.id,
        title=event.title,
        description=event.description,
        event_type=EventType(event.event_type),
        status=EventStatus(event.status),
        starts_at=event.starts_at,
        ends_at=event.ends_at,
        timezone=event.timezone,
        location=event.location,
        meeting_url=event.meeting_url,
        registration_count=count or 0,
    )


async def list_event_registrations(
    db: AsyncSession, event_id: uuid.UUID, *, page: int, page_size: int
) -> Page[EventRegistrationAdminItem]:
    page = max(1, page)
    page_size = _clamp_page_size(page_size)

    query = (
        select(EventRegistration)
        .options(
            selectinload(EventRegistration.candidate_profile).selectinload(
                CandidateProfile.user
            )
        )
        .where(EventRegistration.event_id == event_id)
    )

    total = await _count(db, query, EventRegistration.id)

    rows = (
        await db.execute(
            query.order_by(EventRegistration.registered_at.desc())
            .limit(page_size)
            .offset((page - 1) * page_size)
        )
    ).scalars()

    items = [
        EventRegistrationAdminItem(
            id=registration.id,
            registered_at=registration.registered_at,
            candidate=candidate_summary(
                registration.candidate_profile, registration.candidate_profile.user
            ),
        )
        for registration in rows
    ]
    return Page(items=items, total=total, page=page, page_size=page_size)
