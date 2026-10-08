from pydantic import BaseModel, EmailStr, Field


class RegisterStartRequest(BaseModel):
    email: EmailStr


class RegistrationTokenResponse(BaseModel):
    registration_token: str


class RegisterResendRequest(BaseModel):
    registration_token: str


class RegisterVerifyRequest(BaseModel):
    registration_token: str
    otp: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class RegisterCompleteRequest(BaseModel):
    registration_token: str
    password: str = Field(min_length=8, max_length=128)
