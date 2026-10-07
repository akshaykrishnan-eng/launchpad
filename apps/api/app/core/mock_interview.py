from enum import StrEnum


class InterviewType(StrEnum):
    HR = "HR"
    TECHNICAL = "TECHNICAL"
    BEHAVIOURAL = "BEHAVIOURAL"
    ROLE_SPECIFIC = "ROLE_SPECIFIC"
    FINAL_PREP = "FINAL_PREP"


class SlotStatus(StrEnum):
    OPEN = "OPEN"
    BOOKED = "BOOKED"
    CANCELLED = "CANCELLED"


class InterviewStatus(StrEnum):
    """Deliberately just these three: there is no interviewer portal in
    this phase to ever drive a CONFIRMED or NO_SHOW transition, and a
    state nothing ever sets is just dead UI. BOOKED covers "upcoming"
    end to end; a future interviewer-facing phase can introduce finer
    states without changing this phase's candidate-facing meaning of
    BOOKED/COMPLETED/CANCELLED."""

    BOOKED = "BOOKED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


MOCK_INTERVIEW_CREDIT_COST = 1


class InvalidBookingError(Exception):
    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class SlotUnavailableError(Exception):
    """The slot is no longer OPEN (already booked, cancelled, or in the
    past) by the time this candidate tried to book it."""
