import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_candidate_profile
from app.core.resume import InvalidResumeFileError, ResumeTooLargeError
from app.db.session import get_db
from app.models.candidate_profile import CandidateProfile
from app.schemas.resume import ResumeRead, ReviewRequestRead
from app.services import resume as resume_service
from app.services import resume_review as review_service
from app.services.resume_storage import ResumeStorage, get_resume_storage

router = APIRouter(prefix="/candidate/resumes", tags=["resumes"])


async def _get_owned_resume_or_404(
    db: AsyncSession, profile: CandidateProfile, resume_id: uuid.UUID
):
    resume = await resume_service.get_owned_resume(db, profile, resume_id)
    if resume is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    return resume


@router.get("", response_model=list[ResumeRead])
async def list_resumes(
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> list[ResumeRead]:
    resumes = await resume_service.list_resumes(db, profile)
    latest_version = resumes[0].version if resumes else 0
    return [resume_service.to_resume_read(r, latest_version) for r in resumes]


@router.post("", response_model=ResumeRead, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile,
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
    storage: ResumeStorage = Depends(get_resume_storage),
) -> ResumeRead:
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="A filename is required"
        )

    content = await file.read()

    try:
        resume = await resume_service.upload_resume(
            db,
            storage,
            profile,
            original_filename=file.filename,
            content_type=file.content_type,
            content=content,
        )
    except InvalidResumeFileError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=exc.message
        ) from exc
    except ResumeTooLargeError as exc:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE, detail=str(exc)
        ) from exc
    except resume_service.ResumeUploadConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Could not save this resume version, please try again",
        ) from exc

    latest_version = await resume_service.get_latest_version(db, profile)
    return resume_service.to_resume_read(resume, latest_version)


@router.get("/{resume_id}", response_model=ResumeRead)
async def get_resume(
    resume_id: uuid.UUID,
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> ResumeRead:
    resume = await _get_owned_resume_or_404(db, profile, resume_id)
    latest_version = await resume_service.get_latest_version(db, profile)
    return resume_service.to_resume_read(resume, latest_version)


@router.get("/{resume_id}/download")
async def download_resume(
    resume_id: uuid.UUID,
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
    storage: ResumeStorage = Depends(get_resume_storage),
) -> Response:
    resume = await _get_owned_resume_or_404(db, profile, resume_id)

    try:
        content = await resume_service.download_resume(storage, resume)
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not retrieve this resume right now",
        ) from exc

    return Response(
        content=content,
        media_type=resume.content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{resume.original_filename}"',
        },
    )


@router.post(
    "/{resume_id}/review", response_model=ReviewRequestRead, status_code=status.HTTP_201_CREATED
)
async def request_review(
    resume_id: uuid.UUID,
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> ReviewRequestRead:
    resume = await _get_owned_resume_or_404(db, profile, resume_id)

    try:
        review_request = await review_service.request_review(db, resume)
    except review_service.DuplicateActiveReviewError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A review is already in progress for this resume",
        ) from exc

    # Built explicitly rather than via model_validate(): a freshly
    # created ReviewRequest has no loaded `.result` relationship, and
    # accessing it here would trigger a lazy load outside an awaited
    # context. It's always None for a request this new anyway.
    return ReviewRequestRead(
        id=review_request.id,
        resume_id=review_request.resume_id,
        status=review_request.status,
        requested_at=review_request.requested_at,
        started_at=review_request.started_at,
        completed_at=review_request.completed_at,
        result=None,
    )


@router.get("/{resume_id}/review", response_model=ReviewRequestRead | None)
async def get_review(
    resume_id: uuid.UUID,
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> ReviewRequestRead | None:
    resume = await _get_owned_resume_or_404(db, profile, resume_id)
    review_request = await review_service.get_latest_review(db, resume)
    if review_request is None:
        return None
    return ReviewRequestRead.model_validate(review_request)
