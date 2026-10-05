from enum import StrEnum


class ReviewRequestStatus(StrEnum):
    """Generic lifecycle shared by every reviewable subject (resumes,
    LinkedIn profiles, and whatever comes after). No reviewer portal
    exists yet in any phase to drive REQUESTED -> IN_REVIEW ->
    COMPLETED, so those transitions happen via service functions a
    future phase's reviewer tooling will call -- see
    app/services/resume_review.py and app/services/linkedin_review.py."""

    REQUESTED = "REQUESTED"
    IN_REVIEW = "IN_REVIEW"
    COMPLETED = "COMPLETED"


class ReviewerType(StrEnum):
    HUMAN = "HUMAN"
    AI = "AI"
    HYBRID = "HYBRID"
