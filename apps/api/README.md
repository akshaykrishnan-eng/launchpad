# Ellow Launchpad — API

FastAPI backend for Ellow Launchpad.

See the [repository README](../../README.md) for setup and development instructions, and its [Authentication architecture](../../README.md#authentication-architecture) section for the token/cookie design.

## Structure

- `app/api/` — route definitions (`auth.py`, `rbac_demo.py`, `health.py`) and shared dependencies (`deps.py`: `get_current_user`, `require_role`)
- `app/core/` — configuration, JWT/password hashing (`security.py`), fixed role names (`roles.py`)
- `app/db/` — database session/engine setup
- `app/models/` — SQLAlchemy models: `User`, `Role`, `UserRole`, `RefreshToken`
- `app/schemas/` — Pydantic schemas
- `app/services/` — business logic, kept out of routes and `main.py` (`auth.py`, `roles.py`)
- `migrations/` — Alembic migrations
- `tests/` — pytest tests (registration, login, tokens, authorization, current-user)

## API endpoints

Versioned application APIs live under `/api/v1`; `/health` stays unversioned as the infrastructure health check.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/v1/auth/register` | — | Create an account (assigned the `CANDIDATE` role) |
| POST | `/api/v1/auth/login` | — | Exchange email+password for an access/refresh token pair |
| POST | `/api/v1/auth/refresh` | refresh token | Rotate a refresh token for a new access/refresh pair |
| POST | `/api/v1/auth/logout` | refresh token | Revoke a refresh token |
| GET | `/api/v1/auth/me` | access token | Current user's safe public identity (never a password hash) |
| GET | `/api/v1/rbac-demo/admin-only` | access token + `ADMIN`/`SUPER_ADMIN` role | Minimal proof that `require_role()` works (403 for other roles) |

## Local development (without Docker)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

Note: `pytest` needs a real Postgres connection (migrations run and tables are exercised directly), and Postgres's port isn't published to the host by `docker-compose.yml`. Run tests via `docker compose exec api pytest` (what `make test` does) rather than from a bare host venv, unless you've pointed `DATABASE_URL` at a Postgres instance you've made reachable yourself.

## Commands

- `uvicorn app.main:app --reload` — run the dev server
- `pytest` — run tests (inside the api container; see note above)
- `ruff check .` — lint
- `alembic revision --autogenerate -m "message"` — create a migration
- `alembic upgrade head` — apply migrations
- `alembic current` — check migration status

## Roles

The six system roles (`CANDIDATE`, `INTERVIEWER`, `CAREER_COACH`, `RECRUITER`, `ADMIN`, `SUPER_ADMIN`) are seeded idempotently on every app startup (`app/services/roles.py::seed_roles`, called from `app/main.py`'s lifespan). Re-running startup never duplicates them.
