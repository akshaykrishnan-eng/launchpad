import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.candidate import CandidateStatus, EducationStatus

# --- Candidate profile ---------------------------------------------------


class CandidateProfileUpdate(BaseModel):
    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    mobile_number: str | None = Field(default=None, max_length=20)
    current_city: str | None = Field(default=None, max_length=100)
    current_status: CandidateStatus | None = None
    degree: str | None = Field(default=None, max_length=150)
    specialisation: str | None = Field(default=None, max_length=150)
    graduation_year: int | None = Field(default=None, ge=1950, le=2100)
    career_goal: str | None = Field(default=None, max_length=2000)

    @field_validator("first_name", "last_name", "mobile_number", "current_city", "career_goal")
    @classmethod
    def strip_and_none_if_empty(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class CandidateProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    first_name: str | None
    last_name: str | None
    mobile_number: str | None
    current_city: str | None
    current_status: str | None
    degree: str | None
    specialisation: str | None
    graduation_year: int | None
    career_goal: str | None
    completion_percentage: int


# --- Education -------------------------------------------------------------


class EducationCreate(BaseModel):
    institution: str = Field(min_length=1, max_length=200)
    degree: str = Field(min_length=1, max_length=150)
    specialization: str | None = Field(default=None, max_length=150)
    start_year: int | None = Field(default=None, ge=1950, le=2100)
    graduation_year: int | None = Field(default=None, ge=1950, le=2100)
    education_status: EducationStatus | None = None

    @model_validator(mode="after")
    def graduation_year_not_before_start_year(self) -> "EducationCreate":
        if (
            self.start_year is not None
            and self.graduation_year is not None
            and self.graduation_year < self.start_year
        ):
            raise ValueError("graduation_year cannot be before start_year")
        return self


class EducationUpdate(BaseModel):
    institution: str | None = Field(default=None, min_length=1, max_length=200)
    degree: str | None = Field(default=None, min_length=1, max_length=150)
    specialization: str | None = Field(default=None, max_length=150)
    start_year: int | None = Field(default=None, ge=1950, le=2100)
    graduation_year: int | None = Field(default=None, ge=1950, le=2100)
    education_status: EducationStatus | None = None

    @model_validator(mode="after")
    def graduation_year_not_before_start_year(self) -> "EducationUpdate":
        if (
            self.start_year is not None
            and self.graduation_year is not None
            and self.graduation_year < self.start_year
        ):
            raise ValueError("graduation_year cannot be before start_year")
        return self


class EducationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    institution: str
    degree: str
    specialization: str | None
    start_year: int | None
    graduation_year: int | None
    education_status: str | None


# --- Skills ------------------------------------------------------------


class SkillCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("name must not be blank")
        return stripped


class CandidateSkillRead(BaseModel):
    """Built explicitly in the service layer (id of the join row, name
    from the related Skill) rather than via from_attributes, since the
    name lives on a related object, not a flat column."""

    id: uuid.UUID
    name: str


# --- Work experience ------------------------------------------------------


class WorkExperienceCreate(BaseModel):
    company: str = Field(min_length=1, max_length=200)
    job_title: str = Field(min_length=1, max_length=150)
    location: str | None = Field(default=None, max_length=150)
    start_date: date
    end_date: date | None = None
    is_current: bool = False
    description: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def validate_dates(self) -> "WorkExperienceCreate":
        if self.is_current and self.end_date is not None:
            raise ValueError("A current job cannot have an end date")
        if self.end_date is not None and self.end_date < self.start_date:
            raise ValueError("end_date cannot precede start_date")
        return self


class WorkExperienceUpdate(BaseModel):
    company: str | None = Field(default=None, min_length=1, max_length=200)
    job_title: str | None = Field(default=None, min_length=1, max_length=150)
    location: str | None = Field(default=None, max_length=150)
    start_date: date | None = None
    end_date: date | None = None
    is_current: bool | None = None
    description: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def validate_dates(self) -> "WorkExperienceUpdate":
        if self.is_current and self.end_date is not None:
            raise ValueError("A current job cannot have an end date")
        if (
            self.start_date is not None
            and self.end_date is not None
            and self.end_date < self.start_date
        ):
            raise ValueError("end_date cannot precede start_date")
        return self


class WorkExperienceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    company: str
    job_title: str
    location: str | None
    start_date: date
    end_date: date | None
    is_current: bool
    description: str | None


# --- Career preferences ----------------------------------------------------

_MAX_PREFERENCE_ITEMS = 10


def _clean_string_list(values: list[str]) -> list[str]:
    seen: set[str] = set()
    cleaned: list[str] = []
    for raw in values:
        value = raw.strip()
        if not value:
            raise ValueError("preference values must not be blank")
        if len(value) > 100:
            raise ValueError("preference values must be 100 characters or fewer")
        key = value.lower()
        if key not in seen:
            seen.add(key)
            cleaned.append(value)
    if len(cleaned) > _MAX_PREFERENCE_ITEMS:
        raise ValueError(f"at most {_MAX_PREFERENCE_ITEMS} values are allowed")
    return cleaned


class CareerPreferenceUpdate(BaseModel):
    preferred_roles: list[str] | None = None
    preferred_locations: list[str] | None = None

    @field_validator("preferred_roles", "preferred_locations")
    @classmethod
    def clean_list(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        return _clean_string_list(value)


class CareerPreferenceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    preferred_roles: list[str]
    preferred_locations: list[str]


class ProfileCompletionRead(BaseModel):
    completion_percentage: int
