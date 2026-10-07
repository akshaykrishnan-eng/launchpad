import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.event import (
    DuplicateRegistrationError,
    EventNotFoundError,
    EventNotRegistrableError,
    EventStatus,
    EventType,
    InvalidEventDatesError,
)
from app.models.candidate_profile import CandidateProfile
from app.models.event import Event
from app.models.event_registration import EventRegistration


def effective_status(event: Event, *, now: datetime | None = None) -> EventStatus:
    """PUBLISHED events whose end time has passed read as COMPLETED.
    DRAFT/CANCELLED are returned as-is -- time never promotes a draft
    or resurrects a cancelled event."""
    now = now or datetime.now(UTC)
    status = EventStatus(event.status)
    if status == EventStatus.PUBLISHED and event.ends_at <= now:
        return EventStatus.COMPLETED
    return status


def is_upcoming(event: Event, *, now: datetime | None = None) -> bool:
    now = now or datetime.now(UTC)
    return EventStatus(event.status) == EventStatus.PUBLISHED and event.ends_at > now


async def list_candidate_events(
    db: AsyncSession, profile: CandidateProfile
) -> tuple[list[Event], set[uuid.UUID]]:
    """Returns all non-DRAFT events (candidates never see drafts) plus
    the set of event_ids this candidate is registered for, so the
    route can build EventRead.is_registered without N+1 queries."""
    events_result = await db.execute(
        select(Event).where(Event.status != EventStatus.DRAFT).order_by(Event.starts_at.asc())
    )
    events = list(events_result.scalars())

    registrations_result = await db.execute(
        select(EventRegistration.event_id).where(
            EventRegistration.candidate_profile_id == profile.id
        )
    )
    registered_ids = set(registrations_result.scalars())

    return events, registered_ids


async def get_candidate_visible_event(db: AsyncSession, event_id: uuid.UUID) -> Event | None:
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.status != EventStatus.DRAFT)
    )
    return result.scalar_one_or_none()


async def is_registered(
    db: AsyncSession, profile: CandidateProfile, event_id: uuid.UUID
) -> bool:
    result = await db.execute(
        select(EventRegistration.id).where(
            EventRegistration.event_id == event_id,
            EventRegistration.candidate_profile_id == profile.id,
        )
    )
    return result.scalar_one_or_none() is not None


async def register_for_event(
    db: AsyncSession, profile: CandidateProfile, event_id: uuid.UUID
) -> EventRegistration:
    """Raises EventNotFoundError, EventNotRegistrableError, or
    DuplicateRegistrationError -- callers map these to HTTP errors.

    Locks the event row before checking eligibility, the same
    serialize-then-check technique as mock_interview.py:book_interview,
    so a PUBLISHED-but-about-to-be-cancelled event can't be registered
    into mid-transition.
    """
    event_result = await db.execute(
        select(Event).where(Event.id == event_id).with_for_update()
    )
    event = event_result.scalar_one_or_none()
    if event is None or event.status == EventStatus.DRAFT:
        raise EventNotFoundError

    if not is_upcoming(event):
        raise EventNotRegistrableError("This event is no longer open for registration.")

    existing = await is_registered(db, profile, event_id)
    if existing:
        raise DuplicateRegistrationError

    registration = EventRegistration(event_id=event.id, candidate_profile_id=profile.id)
    db.add(registration)

    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        raise DuplicateRegistrationError from exc

    await db.commit()
    await db.refresh(registration)
    return registration


async def get_event_by_id(db: AsyncSession, event_id: uuid.UUID) -> Event | None:
    result = await db.execute(select(Event).where(Event.id == event_id))
    return result.scalar_one_or_none()


async def create_event(
    db: AsyncSession,
    *,
    title: str,
    description: str,
    event_type: EventType,
    starts_at: datetime,
    ends_at: datetime,
    timezone: str,
    location: str | None,
    meeting_url: str | None,
    status: EventStatus,
) -> Event:
    if ends_at <= starts_at:
        raise InvalidEventDatesError("ends_at must be after starts_at")

    event = Event(
        title=title,
        description=description,
        event_type=event_type,
        status=status,
        starts_at=starts_at,
        ends_at=ends_at,
        timezone=timezone,
        location=location,
        meeting_url=meeting_url,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


async def update_event(db: AsyncSession, event: Event, **fields: object) -> Event:
    starts_at = fields.get("starts_at", event.starts_at)
    ends_at = fields.get("ends_at", event.ends_at)
    if ends_at <= starts_at:
        raise InvalidEventDatesError("ends_at must be after starts_at")

    for key, value in fields.items():
        if value is not None:
            setattr(event, key, value)

    await db.commit()
    await db.refresh(event)
    return event


async def set_event_status(db: AsyncSession, event: Event, status: EventStatus) -> Event:
    event.status = status
    await db.commit()
    await db.refresh(event)
    return event


async def list_registrations(
    db: AsyncSession, event_id: uuid.UUID
) -> list[EventRegistration]:
    result = await db.execute(
        select(EventRegistration)
        .options(
            selectinload(EventRegistration.candidate_profile).selectinload(
                CandidateProfile.user
            )
        )
        .where(EventRegistration.event_id == event_id)
        .order_by(EventRegistration.registered_at.desc())
    )
    return list(result.scalars())


async def count_registrations(db: AsyncSession, event_id: uuid.UUID) -> int:
    result = await db.execute(
        select(EventRegistration.id).where(EventRegistration.event_id == event_id)
    )
    return len(list(result.scalars()))
