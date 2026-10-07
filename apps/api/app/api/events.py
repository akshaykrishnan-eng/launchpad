import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_candidate_profile
from app.core.event import DuplicateRegistrationError, EventNotFoundError, EventNotRegistrableError
from app.db.session import get_db
from app.models.candidate_profile import CandidateProfile
from app.models.event import Event
from app.schemas.event import EventRead, EventRegisterResponse
from app.services import event as event_service
from app.services import notification as notification_service

router = APIRouter(prefix="/candidate/events", tags=["events"])


def _to_read(event: Event, *, is_registered: bool) -> EventRead:
    return EventRead(
        id=event.id,
        title=event.title,
        description=event.description,
        event_type=event.event_type,
        status=event_service.effective_status(event),
        starts_at=event.starts_at,
        ends_at=event.ends_at,
        timezone=event.timezone,
        location=event.location,
        meeting_url=event.meeting_url,
        is_registered=is_registered,
    )


@router.get("", response_model=list[EventRead])
async def list_events(
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> list[EventRead]:
    events, registered_ids = await event_service.list_candidate_events(db, profile)
    return [_to_read(event, is_registered=event.id in registered_ids) for event in events]


@router.get("/{event_id}", response_model=EventRead)
async def get_event(
    event_id: uuid.UUID,
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> EventRead:
    event = await event_service.get_candidate_visible_event(db, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    registered = await event_service.is_registered(db, profile, event_id)
    return _to_read(event, is_registered=registered)


@router.post(
    "/{event_id}/register",
    response_model=EventRegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_for_event(
    event_id: uuid.UUID,
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> EventRegisterResponse:
    try:
        registration = await event_service.register_for_event(db, profile, event_id)
    except EventNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        ) from exc
    except EventNotRegistrableError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.message) from exc
    except DuplicateRegistrationError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You're already registered for this event.",
        ) from exc

    # Fire-and-forget: registration already succeeded and committed
    # above, so a notification failure here must never surface as a
    # registration failure (see notification_service.create_notification_safe).
    event = await event_service.get_event_by_id(db, event_id)
    if event is not None:
        await notification_service.notify_event_registered(db, profile.user_id, event.title)

    return EventRegisterResponse(event_id=event_id, registered_at=registration.registered_at)
