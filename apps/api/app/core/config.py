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


@lru_cache
def get_settings() -> Settings:
    return Settings()
