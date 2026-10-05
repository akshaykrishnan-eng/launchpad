# Ellow Launchpad — API

FastAPI backend for Ellow Launchpad.

See the [repository README](../../README.md) for setup and development instructions, and its [Authentication architecture](../../README.md#authentication-architecture) section for the token/cookie design.

## Structure

- `app/api/` — route definitions (`auth.py`, `candidate.py`, `resumes.py`, `linkedin.py`, `rbac_demo.py`, `health.py`) and shared dependencies (`deps.py`: `get_current_user`, `require_role`, `get_current_candidate_profile`)
- `app/core/` — configuration, JWT/password hashing (`security.py`), fixed role names (`roles.py`), candidate status enums (`candidate.py`), resume status/upload-validation (`resume.py`), LinkedIn URL validation (`linkedin.py`), the shared review-lifecycle/reviewer-type enums (`review.py`)
- `app/db/` — database session/engine setup
- `app/models/` — SQLAlchemy models: `User`, `Role`, `UserRole`, `RefreshToken`, `CandidateProfile`, `Education`, `WorkExperience`, `Skill`, `CandidateSkill`, `CareerPreference`, `Resume`, `ReviewRequest`, `ReviewResult`, `LinkedInProfile`, `LinkedInReviewRequest`, `LinkedInReviewResult`
- `app/schemas/` — Pydantic schemas (`auth.py`, `candidate.py`, `dashboard.py`, `resume.py`, `linkedin.py`)
- `app/services/` — business logic, kept out of routes and `main.py`: `auth.py`, `roles.py`, `candidate_profile.py`, `education.py`, `skills.py`, `work_experience.py`, `career_preferences.py`, `profile_completion.py`, `next_action.py`, `dashboard.py`, `resume.py`, `resume_review.py`, `resume_storage.py`, `linkedin.py`, `linkedin_review.py`
- `migrations/` — Alembic migrations
- `tests/` — pytest tests

## API endpoints

Versioned application APIs live under `/api/v1`; `/health` stays unversioned as the infrastructure health check. Every `/api/v1/candidate/*` endpoint requires the `CANDIDATE` role and derives ownership from the authenticated user — none of them accept a candidate/user id from the client.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/v1/auth/register` | — | Create an account (assigned the `CANDIDATE` role) |
| POST | `/api/v1/auth/login` | — | Exchange email+password for an access/refresh token pair |
| POST | `/api/v1/auth/refresh` | refresh token | Rotate a refresh token for a new access/refresh pair |
| POST | `/api/v1/auth/logout` | refresh token | Revoke a refresh token |
| GET | `/api/v1/auth/me` | access token | Current user's safe public identity (never a password hash) |
| GET/PATCH | `/api/v1/candidate/profile` | candidate | Personal info, degree summary, career goal |
| GET | `/api/v1/candidate/completion` | candidate | Profile completion percentage |
| GET | `/api/v1/candidate/dashboard` | candidate | Aggregated dashboard: name, completion breakdown, next action |
| GET/POST/PATCH/DELETE | `/api/v1/candidate/education` | candidate | Education entries (0..n) |
| GET/POST/DELETE | `/api/v1/candidate/skills` | candidate | Skills (shared catalog + per-candidate link) |
| GET/POST/PATCH/DELETE | `/api/v1/candidate/experience` | candidate | Work experience (0..n) |
| GET/PATCH | `/api/v1/candidate/preferences` | candidate | Preferred roles/locations |
| GET/POST | `/api/v1/candidate/resumes` | candidate | List resume versions / upload a new one (`multipart/form-data`) |
| GET | `/api/v1/candidate/resumes/{id}` | candidate | One resume's metadata |
| GET | `/api/v1/candidate/resumes/{id}/download` | candidate | Streams the file; 404 if not owned |
| POST | `/api/v1/candidate/resumes/{id}/review` | candidate | Request a review (409 if one is already active) |
| GET | `/api/v1/candidate/resumes/{id}/review` | candidate | Latest review + result (`null` if none requested yet) |
| GET/PUT | `/api/v1/candidate/linkedin` | candidate | Current LinkedIn URL (`null` if none added yet); `PUT` rejects an edit while a review is active (409) |
| POST | `/api/v1/candidate/linkedin/review` | candidate | Request a review of the current URL (404 if no URL yet, 409 if one is already active) |
| GET | `/api/v1/candidate/linkedin/review` | candidate | Latest review + result (`null` if none requested yet) |
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

## Resume storage

Resumes are stored on local disk behind a small `ResumeStorage` protocol (`app/services/resume_storage.py`), backed by the `resume_storage` Docker volume — see the root README's [Resume Centre](../../README.md#resume-centre) section for the full design (versioning/review concurrency, path-traversal protections, and why there's no reviewer-facing endpoint yet).

## LinkedIn review architecture

`LinkedInReviewRequest`/`LinkedInReviewResult` are structural twins of Resume's `ReviewRequest`/`ReviewResult` (own tables, not a shared polymorphic one), sharing only the generic `ReviewRequestStatus`/`ReviewerType` enums (`app/core/review.py`). See the root README's [LinkedIn Centre](../../README.md#linkedin-centre) section for why, and for how a review stays correctly attached to the URL it was requested against even after the candidate edits their current URL.
