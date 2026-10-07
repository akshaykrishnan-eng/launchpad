from enum import StrEnum


class CreditType(StrEnum):
    """The generic wallet's credit types. New types are a Python-side
    change only -- see CandidateProfile.current_status for why this
    isn't a Postgres enum."""

    MOCK_INTERVIEW = "MOCK_INTERVIEW"
    CAREER_COACHING = "CAREER_COACHING"
    RESUME_REVIEW = "RESUME_REVIEW"
    LINKEDIN_REVIEW = "LINKEDIN_REVIEW"


class CreditTransactionReason(StrEnum):
    """Why a transaction exists. PACKAGE_PURCHASE and PROMOTIONAL_GRANT
    are both positive-amount grants (no payment integration yet -- see
    app/services/credits.py:grant_credit, which is not exposed through
    any candidate endpoint). MOCK_INTERVIEW_BOOKING is the only reason
    Phase 7 ever writes automatically."""

    PACKAGE_PURCHASE = "PACKAGE_PURCHASE"
    PROMOTIONAL_GRANT = "PROMOTIONAL_GRANT"
    MOCK_INTERVIEW_BOOKING = "MOCK_INTERVIEW_BOOKING"
    RESUME_REVIEW_REQUEST = "RESUME_REVIEW_REQUEST"
    LINKEDIN_REVIEW_REQUEST = "LINKEDIN_REVIEW_REQUEST"
    BOOKING_REFUND = "BOOKING_REFUND"
    ADMIN_ADJUSTMENT = "ADMIN_ADJUSTMENT"


# Human-readable, candidate-safe descriptions -- never expose reference_id
# or reference_type raw values in API responses (see schemas/credits.py).
REASON_DESCRIPTIONS: dict[CreditTransactionReason, str] = {
    CreditTransactionReason.PACKAGE_PURCHASE: "Package purchase",
    CreditTransactionReason.PROMOTIONAL_GRANT: "Promotional credit",
    CreditTransactionReason.MOCK_INTERVIEW_BOOKING: "Mock interview booking",
    CreditTransactionReason.RESUME_REVIEW_REQUEST: "Resume review request",
    CreditTransactionReason.LINKEDIN_REVIEW_REQUEST: "LinkedIn review request",
    CreditTransactionReason.BOOKING_REFUND: "Booking refund",
    CreditTransactionReason.ADMIN_ADJUSTMENT: "Account adjustment",
}


class InsufficientCreditError(Exception):
    def __init__(self, credit_type: CreditType, required: int, available: int) -> None:
        self.credit_type = credit_type
        self.required = required
        self.available = available
        super().__init__(
            f"Insufficient {credit_type.value} credit: required {required}, available {available}"
        )
