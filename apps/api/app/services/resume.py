import uuid
from pathlib import PurePosixPath

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.resume import ResumeStatus, validate_resume_file
from app.models.candidate_profile import CandidateProfile
from app.models.resume import Resume
from app.schemas.resume import ResumeRead
from app.services.resume_storage import ResumeStorage


class ResumeUploadConflictError(Exception):
    """Raised if, despite the row lock below, two uploads still somehow
    collide on the same version number (belt-and-suspenders around the
    uq_resume_candidate_version constraint)."""


async def list_resumes(db: AsyncSession, profile: CandidateProfile) -> list[Resume]:
    result = await db.execute(
        select(Resume)
        .where(Resume.candidate_profile_id == profile.id)
        .order_by(Resume.version.desc())
    )
    return list(result.scalars())


async def get_latest_version(db: AsyncSession, profile: CandidateProfile) -> int:
    result = await db.execute(
        select(func.max(Resume.version)).where(Resume.candidate_profile_id == profile.id)
    )
    return result.scalar_one() or 0


async def list_resumes_page(
    db: AsyncSession, profile: CandidateProfile, *, page: int, page_size: int
) -> tuple[list[Resume], int]:
    """Server-side paginated counterpart to list_resumes, for the
    dedicated Resume History page -- Resume Centre itself still uses
    the unbounded list_resumes (cheap metadata-only rows) to find the
    current/latest version."""
    base_query = select(Resume).where(Resume.candidate_profile_id == profile.id)

    total = (
        await db.execute(select(func.count()).select_from(base_query.subquery()))
    ).scalar_one()

    result = await db.execute(
        base_query.order_by(Resume.version.desc()).limit(page_size).offset((page - 1) * page_size)
    )
    return list(result.scalars()), total


async def get_owned_resume(
    db: AsyncSession, profile: CandidateProfile, resume_id: uuid.UUID
) -> Resume | None:
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.candidate_profile_id == profile.id)
    )
    return result.scalar_one_or_none()


def _generate_storage_key(candidate_profile_id: uuid.UUID, extension: str) -> str:
    """Server-generated only: never derived from the original filename,
    so there is nothing for path traversal to exploit."""
    return f"{candidate_profile_id}/{uuid.uuid4().hex}{extension}"


async def upload_resume(
    db: AsyncSession,
    storage: ResumeStorage,
    profile: CandidateProfile,
    *,
    original_filename: str,
    content_type: str | None,
    content: bytes,
) -> Resume:
    """Raises InvalidResumeFileError / ResumeTooLargeError (from
    app.core.resume) on validation failure -- callers map those to
    HTTP errors."""
    validate_resume_file(original_filename, content_type, content)
    extension = PurePosixPath(original_filename).suffix.lower()

    # Locks the candidate's own profile row for the duration of this
    # transaction, serializing concurrent uploads *for this candidate
    # only* -- other candidates' uploads are unaffected. This is what
    # actually prevents two simultaneous uploads from both computing
    # "next version = 2"; the unique constraint is the backstop.
    await db.execute(
        select(CandidateProfile.id).where(CandidateProfile.id == profile.id).with_for_update()
    )

    next_version = await get_latest_version(db, profile) + 1
    storage_key = _generate_storage_key(profile.id, extension)

    resume = Resume(
        candidate_profile_id=profile.id,
        version=next_version,
        original_filename=original_filename[:255],
        storage_key=storage_key,
        content_type=content_type or "application/octet-stream",
        file_size=len(content),
        status=ResumeStatus.UPLOADED,
    )
    db.add(resume)

    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        raise ResumeUploadConflictError from exc

    # Write to storage only after the DB row is flushed successfully,
    # so a validation/constraint failure never leaves an orphaned file.
    await storage.save(storage_key, content)
    await db.commit()
    await db.refresh(resume)
    return resume


async def download_resume(storage: ResumeStorage, resume: Resume) -> bytes:
    return await storage.open(resume.storage_key)


def to_resume_read(resume: Resume, latest_version: int) -> ResumeRead:
    return ResumeRead(
        id=resume.id,
        version=resume.version,
        original_filename=resume.original_filename,
        content_type=resume.content_type,
        file_size=resume.file_size,
        status=resume.status,
        uploaded_at=resume.uploaded_at,
        is_latest=resume.version == latest_version,
    )
