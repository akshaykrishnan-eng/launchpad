from enum import StrEnum


class EventType(StrEnum):
    WEBINAR = "WEBINAR"
    EVENT = "EVENT"


class EventStatus(StrEnum):
    """DRAFT events are never visible to candidates. PUBLISHED is the
    only state candidates can register for. CANCELLED and COMPLETED
    are both terminal/history states -- COMPLETED is set once an event's
    end time has passed (derived, not transitioned by a worker; see
    app/services/event.py:_effective_status)."""

    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"


class EventNotFoundError(Exception):
    pass


class EventNotRegistrableError(Exception):
    """Raised when registration is attempted against an event that is
    not PUBLISHED and upcoming (draft, cancelled, completed, or past)."""

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class DuplicateRegistrationError(Exception):
    """Belt-and-suspenders around the uq constraint on
    event_registrations(event_id, candidate_profile_id) -- see the
    IntegrityError catch in app/services/event.py:register_for_event."""


class InvalidEventDatesError(Exception):
    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)
