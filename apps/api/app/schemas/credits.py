import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CreditBalanceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    credit_type: str
    balance: int


class CreditTransactionRead(BaseModel):
    """Never includes reference_type/reference_id: those are internal
    traceability fields, not something a candidate needs to see (see
    app/core/credits.py's REASON_DESCRIPTIONS)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    credit_type: str
    amount: int
    reason: str
    description: str
    created_at: datetime
