# Ellow Launchpad — API

FastAPI backend for Ellow Launchpad.

See the [repository README](../../README.md) for setup and development instructions.

## Structure

- `app/api/` — route definitions
- `app/core/` — configuration
- `app/db/` — database session/engine setup
- `app/models/` — SQLAlchemy models (none yet)
- `app/schemas/` — Pydantic schemas
- `app/services/` — business logic, kept out of routes and `main.py`
- `migrations/` — Alembic migrations
- `tests/` — pytest smoke tests

## Local development (without Docker)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

## Commands

- `uvicorn app.main:app --reload` — run the dev server
- `pytest` — run tests
- `ruff check .` — lint
- `alembic revision --autogenerate -m "message"` — create a migration
- `alembic upgrade head` — apply migrations
- `alembic current` — check migration status
