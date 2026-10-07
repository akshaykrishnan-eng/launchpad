from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_candidate_profile
from app.core.credits import CreditType
from app.db.session import get_db
from app.models.candidate_profile import CandidateProfile
from app.schemas.credits import CreditBalanceRead, CreditTransactionRead
from app.schemas.pagination import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, Page, clamp_page_size
from app.services import credits as credits_service

router = APIRouter(prefix="/candidate/credits", tags=["credits"])

_PAGE = Query(default=1, ge=1)
_PAGE_SIZE = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE)


@router.get("", response_model=list[CreditBalanceRead])
async def get_credit_balances(
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> list[CreditBalanceRead]:
    balances = await credits_service.get_all_balances(db, profile)
    # Stable, deterministic order (CreditType declaration order) rather
    # than whatever a dict/group-by happens to return.
    return [
        CreditBalanceRead(credit_type=credit_type.value, balance=balances[credit_type])
        for credit_type in CreditType
    ]


@router.get("/transactions", response_model=Page[CreditTransactionRead])
async def get_credit_transactions(
    page: int = _PAGE,
    page_size: int = _PAGE_SIZE,
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> Page[CreditTransactionRead]:
    page_size = clamp_page_size(page_size)
    transactions, total = await credits_service.list_transactions_page(
        db, profile, page=page, page_size=page_size
    )
    return Page(
        items=[CreditTransactionRead.model_validate(t) for t in transactions],
        total=total,
        page=page,
        page_size=page_size,
    )
