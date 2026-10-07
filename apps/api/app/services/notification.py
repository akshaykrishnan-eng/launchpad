import logging
import uuid
from datetime import UTC, datetime

from sqlalchemy import func, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.notification import NotificationType
from app.core.roles import RoleName
from app.models.notification import Notification
from app.models.role import Role
from app.models.user import User
from app.models.user_role import UserRole

logger = logging.getLogger(__name__)


async def create_notification(
    db: AsyncSession,
    *,
    recipient_user_id: uuid.UUID,
    type: NotificationType,
    title: str,
    message: str,
    event_id: uuid.UUID | None = None,
) -> Notification:
    """The single place a Notification row is ever constructed. Business
    services call the type-specific `notify_*` helpers below rather
    than building Notification(...) directly -- this is what keeps
    notification creation centralized (PRD section 4) and makes a
    future email/push channel a change in one place."""
    notification = Notification(
        recipient_user_id=recipient_user_id,
        type=type,
        title=title,
        message=message,
        event_id=event_id,
    )
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    return notification


async def create_notification_safe(
    db: AsyncSession,
    *,
    recipient_user_id: uuid.UUID,
    type: NotificationType,
    title: str,
    message: str,
    event_id: uuid.UUID | None = None,
) -> Notification | None:
    """Same as create_notification, but never raises: notifications are
    a secondary side effect of an already-succeeded primary operation
    (event registration, booking, review completion), so a failure
    here must never surface as a failure of that operation (PRD
    section 15). Every notify_* helper below goes through this."""
    try:
        return await create_notification(
            db,
            recipient_user_id=recipient_user_id,
            type=type,
            title=title,
            message=message,
            event_id=event_id,
        )
    except Exception:
        logger.exception(
            "Failed to create notification type=%s recipient_user_id=%s", type, recipient_user_id
        )
        return None


async def notify_event_registered(
    db: AsyncSession, recipient_user_id: uuid.UUID, event_title: str
) -> Notification | None:
    return await create_notification_safe(
        db,
        recipient_user_id=recipient_user_id,
        type=NotificationType.EVENT_REGISTERED,
        title="You're registered",
        message=f"You're registered for {event_title}.",
    )


async def get_active_candidate_user_ids(db: AsyncSession) -> list[uuid.UUID]:
    """All active (User.is_active) users holding the CANDIDATE role --
    the only recipient set EVENT_PUBLISHED notifications ever use. Never
    ADMIN/SUPER_ADMIN/INTERVIEWER/CAREER_COACH/RECRUITER."""
    result = await db.execute(
        select(User.id)
        .join(UserRole, UserRole.user_id == User.id)
        .join(Role, Role.id == UserRole.role_id)
        .where(Role.name == RoleName.CANDIDATE.value, User.is_active.is_(True))
    )
    return list(result.scalars())


async def notify_event_published_bulk(
    db: AsyncSession,
    recipient_user_ids: list[uuid.UUID],
    *,
    event_id: uuid.UUID,
    event_title: str,
) -> None:
    """Fans an EVENT_PUBLISHED notification out to many candidates in one
    statement rather than one `create_notification` call (and commit) per
    recipient (CLAUDE.md section on bulk creation / PRD section 6). Uses
    the same multi-row `insert().values([...])` pattern as
    app/services/roles.py:seed_roles, the one existing bulk-insert
    precedent in this codebase.

    Same failure-isolation contract as create_notification_safe: never
    raises -- event publication has already committed by the time this
    runs, so a failure here must never surface as a publish failure."""
    if not recipient_user_ids:
        return

    title = "New event available"
    message = f"{event_title} is now open for registration."
    try:
        await db.execute(
            insert(Notification).values(
                [
                    {
                        "recipient_user_id": recipient_user_id,
                        "type": NotificationType.EVENT_PUBLISHED.value,
                        "title": title,
                        "message": message,
                        "event_id": event_id,
                    }
                    for recipient_user_id in recipient_user_ids
                ]
            )
        )
        await db.commit()
    except Exception:
        logger.exception(
            "Failed to create EVENT_PUBLISHED notifications for event_id=%s", event_id
        )


def _interview_type_label(interview_type: str) -> str:
    return interview_type.replace("_", " ").title()


async def notify_mock_interview_booked(
    db: AsyncSession,
    recipient_user_id: uuid.UUID,
    interview_type: str,
    scheduled_at: datetime,
) -> Notification | None:
    return await create_notification_safe(
        db,
        recipient_user_id=recipient_user_id,
        type=NotificationType.MOCK_INTERVIEW_BOOKED,
        title="Mock interview booked",
        message=(
            f"Your {_interview_type_label(interview_type)} mock interview is booked for "
            f"{scheduled_at:%b %d, %Y at %I:%M %p}."
        ),
    )


async def notify_resume_review_completed(
    db: AsyncSession, recipient_user_id: uuid.UUID
) -> Notification | None:
    return await create_notification_safe(
        db,
        recipient_user_id=recipient_user_id,
        type=NotificationType.RESUME_REVIEW_COMPLETED,
        title="Resume review completed",
        message="Your resume review is ready. Check your results.",
    )


async def notify_linkedin_review_completed(
    db: AsyncSession, recipient_user_id: uuid.UUID
) -> Notification | None:
    return await create_notification_safe(
        db,
        recipient_user_id=recipient_user_id,
        type=NotificationType.LINKEDIN_REVIEW_COMPLETED,
        title="LinkedIn review completed",
        message="Your LinkedIn review is ready. Check your results.",
    )


async def list_notifications_page(
    db: AsyncSession, recipient_user_id: uuid.UUID, *, page: int, page_size: int
) -> tuple[list[Notification], int]:
    base_query = select(Notification).where(Notification.recipient_user_id == recipient_user_id)

    total = (
        await db.execute(select(func.count()).select_from(base_query.subquery()))
    ).scalar_one()

    result = await db.execute(
        base_query.order_by(Notification.created_at.desc())
        .limit(page_size)
        .offset((page - 1) * page_size)
    )
    return list(result.scalars()), total


async def count_unread(db: AsyncSession, recipient_user_id: uuid.UUID) -> int:
    result = await db.execute(
        select(func.count()).select_from(
            select(Notification.id)
            .where(
                Notification.recipient_user_id == recipient_user_id,
                Notification.read_at.is_(None),
            )
            .subquery()
        )
    )
    return result.scalar_one()


async def get_owned_notification(
    db: AsyncSession, recipient_user_id: uuid.UUID, notification_id: uuid.UUID
) -> Notification | None:
    """Ownership is always enforced here via recipient_user_id derived
    from the authenticated session -- never a client-supplied id (PRD
    section 6)."""
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.recipient_user_id == recipient_user_id,
        )
    )
    return result.scalar_one_or_none()


async def mark_read(db: AsyncSession, notification: Notification) -> Notification:
    """Idempotent: marking an already-read notification as read again
    is a no-op (its read_at timestamp is left untouched)."""
    if notification.read_at is None:
        notification.read_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(notification)
    return notification


async def mark_all_read(db: AsyncSession, recipient_user_id: uuid.UUID) -> int:
    """Only affects the authenticated user's own unread notifications.
    Returns how many were marked read."""
    result = await db.execute(
        update(Notification)
        .where(
            Notification.recipient_user_id == recipient_user_id,
            Notification.read_at.is_(None),
        )
        .values(read_at=datetime.now(UTC))
    )
    await db.commit()
    return result.rowcount
