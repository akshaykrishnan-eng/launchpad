import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_candidate_profile
from app.db.session import get_db
from app.models.candidate_profile import CandidateProfile
from app.schemas.notification import MarkAllReadResponse, NotificationRead, UnreadCountRead
from app.schemas.pagination import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, Page, clamp_page_size
from app.services import notification as notification_service

router = APIRouter(prefix="/candidate/notifications", tags=["notifications"])

_PAGE = Query(default=1, ge=1)
_PAGE_SIZE = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE)


@router.get("", response_model=Page[NotificationRead])
async def list_notifications(
    page: int = _PAGE,
    page_size: int = _PAGE_SIZE,
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> Page[NotificationRead]:
    page_size = clamp_page_size(page_size)
    notifications, total = await notification_service.list_notifications_page(
        db, profile.user_id, page=page, page_size=page_size
    )
    return Page(
        items=[NotificationRead.model_validate(n) for n in notifications],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/unread-count", response_model=UnreadCountRead)
async def get_unread_count(
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> UnreadCountRead:
    unread_count = await notification_service.count_unread(db, profile.user_id)
    return UnreadCountRead(unread_count=unread_count)


@router.post("/{notification_id}/read", response_model=NotificationRead)
async def mark_notification_read(
    notification_id: uuid.UUID,
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> NotificationRead:
    notification = await notification_service.get_owned_notification(
        db, profile.user_id, notification_id
    )
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    updated = await notification_service.mark_read(db, notification)
    return NotificationRead.model_validate(updated)


@router.post("/read-all", response_model=MarkAllReadResponse)
async def mark_all_notifications_read(
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> MarkAllReadResponse:
    marked_read = await notification_service.mark_all_read(db, profile.user_id)
    return MarkAllReadResponse(marked_read=marked_read)
