from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_candidate_profile
from app.db.session import get_db
from app.models.candidate_profile import CandidateProfile
from app.schemas.linkedin import (
    LinkedInProfileRead,
    LinkedInProfileUpdate,
    LinkedInReviewRequestRead,
)
from app.services import linkedin as linkedin_service
from app.services import linkedin_review as linkedin_review_service

router = APIRouter(prefix="/candidate/linkedin", tags=["linkedin"])


@router.get("", response_model=LinkedInProfileRead | None)
async def get_linkedin_profile(
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> LinkedInProfileRead | None:
    linkedin_profile = await linkedin_service.get_profile(db, profile)
    if linkedin_profile is None:
        return None
    return LinkedInProfileRead.model_validate(linkedin_profile)


@router.put("", response_model=LinkedInProfileRead)
async def update_linkedin_profile(
    payload: LinkedInProfileUpdate,
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> LinkedInProfileRead:
    try:
        linkedin_profile = await linkedin_service.upsert_profile(
            db, profile, payload.profile_url
        )
    except linkedin_service.ActiveReviewBlocksEditError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You can't change your LinkedIn URL while a review is in progress.",
        ) from exc
    return LinkedInProfileRead.model_validate(linkedin_profile)


@router.post(
    "/review", response_model=LinkedInReviewRequestRead, status_code=status.HTTP_201_CREATED
)
async def request_linkedin_review(
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> LinkedInReviewRequestRead:
    linkedin_profile = await linkedin_service.get_profile(db, profile)
    if linkedin_profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Add your LinkedIn profile URL before requesting a review.",
        )

    try:
        review_request = await linkedin_review_service.request_review(db, linkedin_profile)
    except linkedin_review_service.DuplicateActiveReviewError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A review is already in progress for this LinkedIn profile",
        ) from exc

    # Built explicitly, not via model_validate(): a freshly created
    # review has no loaded `.result` relationship, and accessing it
    # here would trigger a lazy load outside an awaited context (the
    # same MissingGreenlet trap documented in app/api/resumes.py).
    return LinkedInReviewRequestRead(
        id=review_request.id,
        status=review_request.status,
        profile_url_snapshot=review_request.profile_url_snapshot,
        requested_at=review_request.requested_at,
        started_at=review_request.started_at,
        completed_at=review_request.completed_at,
        result=None,
    )


@router.get("/review", response_model=LinkedInReviewRequestRead | None)
async def get_linkedin_review(
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> LinkedInReviewRequestRead | None:
    linkedin_profile = await linkedin_service.get_profile(db, profile)
    if linkedin_profile is None:
        return None

    review_request = await linkedin_review_service.get_latest_review(db, linkedin_profile)
    if review_request is None:
        return None
    return LinkedInReviewRequestRead.model_validate(review_request)
