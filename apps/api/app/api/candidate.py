import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_candidate_profile
from app.db.session import get_db
from app.models.candidate_profile import CandidateProfile
from app.schemas.candidate import (
    CandidateProfileRead,
    CandidateProfileUpdate,
    CandidateSkillRead,
    CareerPreferenceRead,
    CareerPreferenceUpdate,
    EducationCreate,
    EducationRead,
    EducationUpdate,
    ProfileCompletionRead,
    SkillCreate,
    WorkExperienceCreate,
    WorkExperienceRead,
    WorkExperienceUpdate,
)
from app.schemas.dashboard import DashboardResponse
from app.services import candidate_profile as profile_service
from app.services import career_preferences as preference_service
from app.services import education as education_service
from app.services import skills as skills_service
from app.services import work_experience as experience_service
from app.services.dashboard import build_dashboard

router = APIRouter(prefix="/candidate", tags=["candidate"])


def _validation_error_to_http(exc: ValidationError) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail=[{"msg": e["msg"], "loc": e["loc"]} for e in exc.errors()],
    )


async def _profile_read(db: AsyncSession, profile: CandidateProfile) -> CandidateProfileRead:
    completion = await profile_service.calculate_completion_for(db, profile)
    return CandidateProfileRead(
        id=profile.id,
        user_id=profile.user_id,
        first_name=profile.first_name,
        last_name=profile.last_name,
        mobile_number=profile.mobile_number,
        current_city=profile.current_city,
        current_status=profile.current_status,
        degree=profile.degree,
        specialisation=profile.specialisation,
        graduation_year=profile.graduation_year,
        career_goal=profile.career_goal,
        completion_percentage=completion,
    )


# --- Profile ----------------------------------------------------------


@router.get("/profile", response_model=CandidateProfileRead)
async def get_profile(
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> CandidateProfileRead:
    return await _profile_read(db, profile)


@router.patch("/profile", response_model=CandidateProfileRead)
async def patch_profile(
    payload: CandidateProfileUpdate,
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> CandidateProfileRead:
    profile = await profile_service.update_profile(db, profile, payload)
    return await _profile_read(db, profile)


@router.get("/completion", response_model=ProfileCompletionRead)
async def get_completion(
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> ProfileCompletionRead:
    completion = await profile_service.calculate_completion_for(db, profile)
    return ProfileCompletionRead(completion_percentage=completion)


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> DashboardResponse:
    return await build_dashboard(db, profile)


# --- Education ----------------------------------------------------------


@router.get("/education", response_model=list[EducationRead])
async def list_education(
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> list[EducationRead]:
    entries = await education_service.list_education(db, profile)
    return [EducationRead.model_validate(entry) for entry in entries]


@router.post("/education", response_model=EducationRead, status_code=status.HTTP_201_CREATED)
async def create_education(
    payload: EducationCreate,
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> EducationRead:
    entry = await education_service.create_education(db, profile, payload)
    return EducationRead.model_validate(entry)


@router.patch("/education/{education_id}", response_model=EducationRead)
async def patch_education(
    education_id: uuid.UUID,
    payload: EducationUpdate,
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> EducationRead:
    entry = await education_service.get_owned_education(db, profile, education_id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Education not found")
    try:
        entry = await education_service.update_education(db, entry, payload)
    except ValidationError as exc:
        raise _validation_error_to_http(exc) from exc
    return EducationRead.model_validate(entry)


@router.delete("/education/{education_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_education(
    education_id: uuid.UUID,
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> None:
    entry = await education_service.get_owned_education(db, profile, education_id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Education not found")
    await education_service.delete_education(db, entry)


# --- Skills ---------------------------------------------------------------


@router.get("/skills", response_model=list[CandidateSkillRead])
async def list_skills(
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> list[CandidateSkillRead]:
    candidate_skills = await skills_service.list_candidate_skills(db, profile)
    return [
        CandidateSkillRead(id=cs.id, name=cs.skill.name) for cs in candidate_skills
    ]


@router.post(
    "/skills", response_model=CandidateSkillRead, status_code=status.HTTP_201_CREATED
)
async def add_skill(
    payload: SkillCreate,
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> CandidateSkillRead:
    try:
        candidate_skill = await skills_service.add_skill(db, profile, payload.name)
    except skills_service.DuplicateSkillError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Skill already added"
        ) from exc
    return CandidateSkillRead(id=candidate_skill.id, name=candidate_skill.skill.name)


@router.delete("/skills/{candidate_skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_skill(
    candidate_skill_id: uuid.UUID,
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> None:
    candidate_skill = await skills_service.get_owned_candidate_skill(
        db, profile, candidate_skill_id
    )
    if candidate_skill is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
    await skills_service.remove_skill(db, candidate_skill)


# --- Work experience --------------------------------------------------


@router.get("/experience", response_model=list[WorkExperienceRead])
async def list_experience(
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> list[WorkExperienceRead]:
    entries = await experience_service.list_experience(db, profile)
    return [WorkExperienceRead.model_validate(entry) for entry in entries]


@router.post(
    "/experience", response_model=WorkExperienceRead, status_code=status.HTTP_201_CREATED
)
async def create_experience(
    payload: WorkExperienceCreate,
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> WorkExperienceRead:
    entry = await experience_service.create_experience(db, profile, payload)
    return WorkExperienceRead.model_validate(entry)


@router.patch("/experience/{experience_id}", response_model=WorkExperienceRead)
async def patch_experience(
    experience_id: uuid.UUID,
    payload: WorkExperienceUpdate,
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> WorkExperienceRead:
    entry = await experience_service.get_owned_experience(db, profile, experience_id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Experience not found")
    try:
        entry = await experience_service.update_experience(db, entry, payload)
    except ValidationError as exc:
        raise _validation_error_to_http(exc) from exc
    return WorkExperienceRead.model_validate(entry)


@router.delete("/experience/{experience_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_experience(
    experience_id: uuid.UUID,
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> None:
    entry = await experience_service.get_owned_experience(db, profile, experience_id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Experience not found")
    await experience_service.delete_experience(db, entry)


# --- Career preferences ----------------------------------------------


@router.get("/preferences", response_model=CareerPreferenceRead)
async def get_preferences(
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> CareerPreferenceRead:
    preference = await preference_service.get_or_create_preference(db, profile)
    return CareerPreferenceRead.model_validate(preference)


@router.patch("/preferences", response_model=CareerPreferenceRead)
async def patch_preferences(
    payload: CareerPreferenceUpdate,
    profile: CandidateProfile = Depends(get_current_candidate_profile),
    db: AsyncSession = Depends(get_db),
) -> CareerPreferenceRead:
    preference = await preference_service.get_or_create_preference(db, profile)
    preference = await preference_service.update_preference(db, preference, payload)
    return CareerPreferenceRead.model_validate(preference)
