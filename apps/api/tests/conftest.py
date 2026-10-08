import pytest
import pytest_asyncio
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text

import app.models  # noqa: F401  (ensures metadata is populated)
import app.services.registration as registration_service
from app.db.session import AsyncSessionLocal
from app.main import app as fastapi_app
from app.services.roles import seed_roles


@pytest.fixture(scope="session", autouse=True)
def _migrated_schema() -> None:
    """Runs the real Alembic migrations once against the configured
    database before the suite starts, proving `alembic upgrade head`
    works from a clean database and giving tests real tables to use."""
    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")


@pytest_asyncio.fixture(scope="session", autouse=True)
async def _seeded_roles(_migrated_schema: None) -> None:
    async with AsyncSessionLocal() as db:
        await seed_roles(db)


@pytest_asyncio.fixture(autouse=True)
async def _clean_auth_tables(_seeded_roles: None):
    yield
    async with AsyncSessionLocal() as db:
        await db.execute(text("DELETE FROM refresh_tokens"))
        await db.execute(text("DELETE FROM user_roles"))
        await db.execute(text("DELETE FROM users"))
        await db.execute(text("DELETE FROM pending_registrations"))
        await db.commit()


@pytest.fixture
def client() -> TestClient:
    with TestClient(fastapi_app) as test_client:
        yield test_client


class _CapturingEmailService:
    """Test double for app.services.email.EmailService: captures every
    send() instead of actually delivering it, so tests can read the OTP
    straight out of the email body rather than needing a real mailbox."""

    def __init__(self) -> None:
        self.sent: list[dict] = []

    async def send(self, *, to: str, subject: str, body: str) -> None:
        self.sent.append({"to": to, "subject": subject, "body": body})


@pytest.fixture
def email_service(monkeypatch) -> _CapturingEmailService:
    fake = _CapturingEmailService()
    monkeypatch.setattr(registration_service, "get_email_service", lambda: fake)
    return fake
