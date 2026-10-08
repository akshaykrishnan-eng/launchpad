from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Ellow Launchpad API"
    database_url: str = "postgresql+asyncpg://launchpad:launchpad@localhost:5432/launchpad"
    api_port: int = 8000
    cors_origins: list[str] = ["http://localhost:3000"]

    # JWT access tokens. jwt_secret_key MUST be overridden with a long random
    # value outside local development (see .env.example).
    jwt_secret_key: str = "dev-only-insecure-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30
    # A client can legitimately fire more than one request at the exact
    # moment its access token expires (parallel page sub-resources, a
    # prefetched navigation landing next to the real one, two open tabs).
    # Both reach refresh rotation with the same still-cookie-valid raw
    # token; whichever loses the race presents an already-rotated token.
    # Without this grace window, reuse detection treats that as theft and
    # revokes the whole session -- including the token the winner just
    # received -- logging an honestly-authenticated user out. A short
    # window (mirroring Auth0's "reuse interval" for rotating refresh
    # tokens) tolerates exactly that one-hop race while still nuking the
    # chain for reuse that shows up later, once the window has closed.
    refresh_token_reuse_grace_seconds: int = 5

    # Resume storage. A local directory for now (see
    # app/services/resume_storage.py) -- swapping in S3/object storage
    # later means implementing ResumeStorage again, not touching resume
    # business logic.
    resume_storage_dir: str = "/app/storage/resumes"
    resume_max_size_mb: int = 5

    # Email verification (registration OTP). See
    # app/services/registration.py and app/services/email.py.
    otp_expire_minutes: int = 5
    otp_max_attempts: int = 5
    otp_resend_cooldown_seconds: int = 60
    # Covers the whole start -> verify -> complete flow, not just the
    # OTP's own lifetime -- must outlive otp_expire_minutes since a
    # candidate may resend (which re-arms the OTP clock) without the
    # registration token itself being reissued.
    pending_registration_token_expire_minutes: int = 15

    # Email delivery. "console" (default) logs the email instead of
    # sending it, so local/dev/test environments need zero email
    # configuration. Set to "smtp" and provide the smtp_* settings below
    # to send real email -- see app/services/email.py.
    email_provider: str = "console"
    email_from: str = "Launchpad <no-reply@launchpad.dev>"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
