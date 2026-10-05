from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Ellow Launchpad API"
    database_url: str = "postgresql+asyncpg://launchpad:launchpad@localhost:5432/launchpad"
    api_port: int = 8000
    cors_origins: list[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
