from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import get_settings

settings = get_settings()

# NullPool: an asyncpg connection is bound to the event loop it was
# created on. Starlette's TestClient runs the app in its own background
# event loop (separate from pytest-asyncio's), so a pooled connection
# checked out under one loop and reused under another raises
# "attached to a different loop". NullPool opens a fresh connection per
# checkout instead of reusing one across requests, which sidesteps that
# entirely -- the right tradeoff at this project's current scale.
engine = create_async_engine(settings.database_url, poolclass=NullPool)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        yield session
