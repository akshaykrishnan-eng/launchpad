from enum import StrEnum


class NotificationType(StrEnum):
    """Controlled, extensible set of in-app notification types. New
    types are a Python-side addition only (same rationale as
    CreditType/CreditTransactionReason) -- never a free-text field."""

    EVENT_REGISTERED = "EVENT_REGISTERED"
    MOCK_INTERVIEW_BOOKED = "MOCK_INTERVIEW_BOOKED"
    RESUME_REVIEW_COMPLETED = "RESUME_REVIEW_COMPLETED"
    LINKEDIN_REVIEW_COMPLETED = "LINKEDIN_REVIEW_COMPLETED"


class NotificationNotFoundError(Exception):
    pass
