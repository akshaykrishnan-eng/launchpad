import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.credits import REASON_DESCRIPTIONS, CreditTransactionReason, CreditType
from app.models.candidate_profile import CandidateProfile
from app.models.credit_transaction import CreditTransaction


async def get_balance(db: AsyncSession, profile: CandidateProfile, credit_type: CreditType) -> int:
    result = await db.execute(
        select(func.coalesce(func.sum(CreditTransaction.amount), 0)).where(
            CreditTransaction.candidate_profile_id == profile.id,
            CreditTransaction.credit_type == credit_type,
        )
    )
    return result.scalar_one()


async def get_all_balances(db: AsyncSession, profile: CandidateProfile) -> dict[CreditType, int]:
    """Always returns all four credit types, even at 0 -- the wallet is
    generic even though CAREER_COACHING has no consuming workflow yet
    (PRD section 20)."""
    result = await db.execute(
        select(CreditTransaction.credit_type, func.sum(CreditTransaction.amount))
        .where(CreditTransaction.candidate_profile_id == profile.id)
        .group_by(CreditTransaction.credit_type)
    )
    totals = {row[0]: row[1] for row in result.all()}
    return {credit_type: totals.get(credit_type.value, 0) for credit_type in CreditType}


async def list_transactions(
    db: AsyncSession, profile: CandidateProfile
) -> list[CreditTransaction]:
    result = await db.execute(
        select(CreditTransaction)
        .where(CreditTransaction.candidate_profile_id == profile.id)
        .order_by(CreditTransaction.created_at.desc())
    )
    return list(result.scalars())


async def list_transactions_page(
    db: AsyncSession, profile: CandidateProfile, *, page: int, page_size: int
) -> tuple[list[CreditTransaction], int]:
    """Server-side paginated counterpart to list_transactions, for the
    Credits Centre's recent-activity preview and the dedicated Credit
    History page (PRD: never fetch the whole ledger into the browser).
    Returns (page of rows, total row count) -- never fewer rows than
    exist, never more than page_size."""
    base_query = select(CreditTransaction).where(
        CreditTransaction.candidate_profile_id == profile.id
    )

    total = (
        await db.execute(select(func.count()).select_from(base_query.subquery()))
    ).scalar_one()

    result = await db.execute(
        base_query.order_by(CreditTransaction.created_at.desc())
        .limit(page_size)
        .offset((page - 1) * page_size)
    )
    return list(result.scalars()), total


async def grant_credit(
    db: AsyncSession,
    profile: CandidateProfile,
    credit_type: CreditType,
    amount: int,
    reason: CreditTransactionReason,
    *,
    description: str | None = None,
) -> CreditTransaction:
    """Adds credit. Not exposed through any candidate endpoint -- there
    is no payment system yet (PRD section 4/40), so this is only called
    from controlled internal/admin/test setup, the same "manual until a
    provider exists" approach as Resume/LinkedIn's complete_review."""
    if amount <= 0:
        raise ValueError(
            "grant_credit amount must be positive; use a booking debit to consume credit"
        )

    transaction = CreditTransaction(
        candidate_profile_id=profile.id,
        credit_type=credit_type,
        amount=amount,
        reason=reason,
        description=description or REASON_DESCRIPTIONS[reason],
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)
    return transaction


def build_debit_transaction(
    profile_id: uuid.UUID,
    credit_type: CreditType,
    amount: int,
    reason: CreditTransactionReason,
    *,
    reference_type: str,
    reference_id: uuid.UUID,
    description: str | None = None,
) -> CreditTransaction:
    """Constructs (but doesn't add/commit) a debit row with a
    pre-assigned id, so a caller that needs to cross-reference it from
    another row created in the same flush (see
    app/services/mock_interview.py:book_interview) can do so before
    either row is persisted."""
    if amount >= 0:
        raise ValueError("a debit transaction's amount must be negative")

    return CreditTransaction(
        id=uuid.uuid4(),
        candidate_profile_id=profile_id,
        credit_type=credit_type,
        amount=amount,
        reason=reason,
        reference_type=reference_type,
        reference_id=reference_id,
        description=description or REASON_DESCRIPTIONS[reason],
    )
