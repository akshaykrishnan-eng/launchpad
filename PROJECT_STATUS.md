# Ellow Launchpad — Project Status

> Living project-status document.
>
> This file describes the current implementation state of Launchpad.
>
> For development rules, see `CLAUDE.md`.
> For technical architecture, see `ARCHITECTURE.md`.

---

# 1. Current Project State

**Project:** Ellow Launchpad

**Current implementation:** Phase 13.1 complete

**Current state:** MVP candidate platform + admin operational platform implemented through Phase 10, a Phase 11 visual-hierarchy refinement of the candidate-facing UI (shared `PageHero` pattern on Credits/Resume/LinkedIn/Mock Interviews), a Phase 12 Events & Webinars MVP (candidate `/app/events` list/detail/registration, admin `/admin/events` CRUD + lifecycle + registrations), and a Phase 13 in-app Notifications V1 (candidate `/app/notifications`, sidebar unread badge, wired into event registration/mock interview booking/resume+LinkedIn review completion), and a Phase 13.1 follow-up wiring event publication into that same notification system (`EVENT_PUBLISHED`, candidate click-through to the event detail page). Credits are a dedicated candidate-facing platform section (`/app/credits`), Resume Review / LinkedIn Review both consume credits server-side, and primary candidate pages now show only a recent-history preview with dedicated, server-side-paginated history pages (`/app/credits/history`, `/app/resume/history`) for the complete record.

**Next immediate task:** Git cleanup and phase-by-phase commits/tags (still outstanding from before Phase 11 -- see section 23).

---

# 2. Project Architecture

Current runtime architecture:

```text
Browser
    ↓
Next.js
    ↓
FastAPI
    ↓
PostgreSQL
```

Current backend architecture:

```text
API Route
    ↓
Service / Domain Logic
    ↓
SQLAlchemy
    ↓
PostgreSQL
```

Detailed architecture is documented in:

```text
ARCHITECTURE.md
```

Development rules are documented in:

```text
CLAUDE.md
```

---

# 3. Completed Phases

## Phase 1 — Foundation ✅

Completed:

- Next.js App Router
- TypeScript
- FastAPI
- PostgreSQL
- Docker development environment
- Alembic
- frontend health endpoint
- backend health endpoint
- initial testing setup
- linting/build setup

---

## Phase 2 — Authentication & RBAC ✅

Completed:

- User model
- Role model
- UserRole relationship
- RefreshToken model
- JWT access tokens
- opaque refresh tokens
- refresh-token hashing
- refresh-token rotation
- refresh-token reuse detection
- HttpOnly cookie handling
- registration
- login
- refresh
- logout
- current-user endpoint
- RBAC

Roles:

```text
CANDIDATE
INTERVIEWER
CAREER_COACH
RECRUITER
ADMIN
SUPER_ADMIN
```

Authorization is backend-enforced.

---

## Phase 3 — Candidate Identity & Onboarding ✅

Completed:

- CandidateProfile
- Education
- WorkExperience
- Skill
- CandidateSkill
- CareerPreference
- candidate onboarding
- profile completion calculation
- candidate profile APIs
- candidate ownership enforcement
- education CRUD
- skills management
- work experience CRUD
- career preferences

Candidate data is scoped to the authenticated candidate.

---

## Phase 4 — Candidate Dashboard ✅

Completed:

- candidate dashboard API
- profile completion
- completion breakdown
- deterministic next-action logic
- candidate dashboard UI
- dashboard cards
- loading states
- error states
- responsive dashboard
- dashboard tests

Next-action logic is deterministic and service-driven.

---

## Phase 5 — Resume Centre ✅

Completed:

- Resume model
- versioned resume uploads
- local file-storage abstraction
- resume validation
- authenticated resume download
- Resume Review Request
- Resume Review Result
- review lifecycle
- candidate resume UI
- resume version history

Current review workflow:

```text
Candidate submits resume
        ↓
Review requested
        ↓
Manual review
        ↓
Review result
        ↓
Candidate sees result
```

AI resume analysis is NOT implemented in Launchpad yet.

---

## Phase 6 — LinkedIn Centre & Review Workflow ✅

Completed:

- LinkedIn profile
- LinkedIn URL validation
- URL normalization
- LinkedIn review request
- LinkedIn review result
- manual review workflow
- candidate LinkedIn UI
- review state handling

Launchpad does NOT scrape LinkedIn in the current implementation.

---

## Phase 6.6 — Global UI / Design System ✅

Completed:

- Launchpad application shell
- sidebar
- responsive navigation
- shared page header
- buttons
- cards
- forms
- status badges
- loading states
- empty states
- error states
- responsive layouts
- candidate-facing design consistency

Current design tokens:

```text
Primary:
#336CFC

Main text:
#222222

Secondary/sidebar/icons:
#585858
```

No new frontend UI framework was introduced.

Not used:

```text
Tailwind
shadcn/ui
MUI
Chakra
Bootstrap
```

### Known deferred issue

A shared color-contrast issue exists on:

- active sidebar navigation
- primary buttons

This is a design-token-level issue from Phase 6.6.

---

## Phase 7 — Credits & Mock Interviews ✅

Completed:

- credit types
- credit transaction ledger
- credit balance calculation
- atomic credit deduction
- interview slots
- mock interview booking
- booking protection
- idempotency
- mock interview lifecycle
- interview completion
- interview feedback
- dashboard integration

Current interview lifecycle:

```text
BOOKED
    ↓
COMPLETED

or

BOOKED
    ↓
CANCELLED
```

Credits are ledger-based.

The ledger is the source of truth.

---

# 4. Phase 8 — Admin Dashboard & Candidate 360 ✅

Phase 8 is complete.

Objective:

Build an ADMIN/SUPER_ADMIN-only operational interface without duplicating Phase 3–7 business logic.

---

## Admin Routes

Implemented:

```text
/admin
/admin/candidates
/admin/candidates/[id]

/admin/resume-reviews
/admin/resume-reviews/[id]

/admin/linkedin-reviews
/admin/linkedin-reviews/[id]

/admin/mock-interviews
/admin/mock-interviews/[id]

/admin/events
/admin/events/new
/admin/events/[id]

/admin/credits
```

---

## Admin Authorization

Allowed roles:

```text
ADMIN
SUPER_ADMIN
```

Backend authorization is enforced using the existing role system.

Frontend route protection is only a UX convenience.

Backend authorization remains the security boundary.

Verified:

```text
Unauthenticated → login
Candidate → denied / candidate app
Non-admin roles → denied
ADMIN → allowed
SUPER_ADMIN → allowed
```

No query-string role bypass exists.

---

# 5. Phase 8 — Admin Dashboard

Implemented real metrics for:

- candidates
- resume reviews
- LinkedIn reviews
- interview slots
- mock interviews
- credits

Empty database produces real zero/empty states.

No fabricated data is used.

---

# 6. Phase 8 — Candidate Management

Implemented:

- candidate list
- server-side pagination
- name search
- email search
- profile completion
- real candidate data
- empty states

Pagination:

```text
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 50
```

Pagination is enforced server-side.

Candidate list avoids N+1 completion queries through bulk aggregate queries.

---

# 7. Phase 8 — Candidate 360

Implemented read-oriented Candidate 360 view.

Includes:

```text
Candidate identity
Profile
Education
Skills
Work experience
Career preferences
Resume
Resume review
LinkedIn
LinkedIn review
Mock interviews
Credits
```

Candidate 360 reuses existing domain services.

It does not create duplicate business logic.

Sensitive authentication information is excluded.

Never expose:

```text
password
password_hash
refresh_token
refresh_token_hash
access_token
```

---

# 8. Phase 8 — Resume Review Operations

Implemented:

```text
Resume review queue
    ↓
Review detail
    ↓
Start review
    ↓
Complete review
    ↓
Candidate sees result
```

Admin completion uses the existing review service.

Current reviewer type:

```text
HUMAN
```

Validation includes:

- score range
- required summary
- review state
- duplicate completion protection

---

# 9. Phase 8 — LinkedIn Review Operations

Implemented the same operational workflow as Resume Review:

```text
LinkedIn review queue
    ↓
Review detail
    ↓
Start review
    ↓
Complete review
    ↓
Candidate sees result
```

Existing LinkedIn review services are reused.

---

# 10. Phase 8 — Mock Interview Operations

Implemented:

- admin slot creation
- slot validation
- booking visibility
- booked interview list
- completed interview list
- cancelled interview list
- interview completion
- feedback entry
- score validation

Admin can create interview slots.

Candidate users cannot access the admin slot-creation endpoint.

Interview completion reuses the existing Phase 7 interview service.

---

# 11. Phase 8 — Credit Management

Implemented:

- credit grant form
- credit type selection
- amount validation
- candidate validation
- reason/description
- credit ledger view
- candidate attribution
- balance update through the ledger

Credit grants use the existing credit service.

No direct balance mutation is performed by the admin route.

---

# 12. Phase 8 — Database

No new database migration was required.

Phase 8 only introduced Python-level `viewonly=True` relationships where needed.

Alembic verification showed no real schema drift.

Current migration head remains the Phase 7 migration.

---

# 12.1 Phase 9 — Platform-Wide Credits & Review Enforcement ✅

Objective:

Move Credits out of the Mock Interviews UI into its own candidate-facing
section, and make Resume Review / LinkedIn Review actually consume
their respective credit types -- without rebuilding the Phase 7 ledger
or introducing a second credit system.

## Credits Centre

- new route: `/app/credits`
- shows all four credit balances (MOCK_INTERVIEW, CAREER_COACHING,
  RESUME_REVIEW, LINKEDIN_REVIEW) and full transaction history
- reuses the existing `GET /candidate/credits` and
  `GET /candidate/credits/transactions` endpoints -- no new backend
  endpoint was needed
- added to the sidebar's Career Tools navigation (Dashboard / Profile /
  Resume / LinkedIn / Interviews / Credits); the mobile bottom tab bar
  intentionally keeps its existing five destinations

## Mock Interviews

- the full "All credit balances" wallet section and its transaction-
  history toggle were removed from Mock Interviews
- replaced with a small contextual indicator next to the booking CTA
  ("You have N Mock Interview credits") and a "View Credits" link
- the existing MOCK_INTERVIEW credit check/deduction in
  `mock_interview_service.book_interview` was not touched

## Resume Review / LinkedIn Review credit enforcement

- `RESUME_REVIEW_CREDIT_COST = 1` (`app/core/resume.py`) and
  `LINKEDIN_REVIEW_CREDIT_COST = 1` (`app/core/linkedin.py`), mirroring
  `MOCK_INTERVIEW_CREDIT_COST`
- two new ledger reasons: `RESUME_REVIEW_REQUEST`,
  `LINKEDIN_REVIEW_REQUEST` (Python-side `CreditTransactionReason`
  additions only -- no schema change, same as every other credit type)
- `resume_review.request_review` / `linkedin_review.request_review`
  now take the candidate's `CandidateProfile` and, inside the same
  transaction as the existing duplicate-active-review check: lock the
  candidate's profile row, verify the balance, debit the credit, and
  create the review request -- all-or-nothing, exactly the pattern
  `mock_interview_service.book_interview` already established in Phase 7
- insufficient credit raises the existing `InsufficientCreditError`,
  mapped to `409 Conflict` by the API layer (same status Mock Interview
  booking already uses for this)
- the frontend derives the sufficient/insufficient state from the
  balance it already has (not from parsing the error), so a stale-
  balance race still surfaces as a normal error message, and the
  authoritative check stays entirely server-side

## Resume / LinkedIn UI

- new shared, presentation-only `CreditRequirement` component
  (`features/credits/CreditRequirement.tsx`) shows the credit cost and
  current balance next to "Request Review" when sufficient, or a "View
  Credits" link to `/app/credits` when not -- used identically by both
  Resume Centre and LinkedIn Centre
- the backend remains the only authority on balance validation and
  deduction; the component only renders what its caller already knows

## Concurrency

- two different resumes, one RESUME_REVIEW credit, two concurrent
  `request_review` calls via `asyncio.gather`: exactly one succeeds,
  balance never goes negative (mirrors the Phase 7 mock-interview
  credit-race test)
- LinkedIn has only one profile per candidate, so its equivalent test
  can't isolate the credit race from the pre-existing duplicate-active-
  review race the same way; it still asserts exactly one request is
  created and the balance never goes negative

## Career Coaching

Remains a wallet-only credit type with no consuming workflow, as
before -- not implemented in this phase.

## Database / migrations

No new migration. The generic Phase 7 ledger (`credit_transactions`)
and its reusable service functions (`get_balance`, `build_debit_transaction`)
were reused as-is.

---

# 12.2 Phase 10 — History UX & Pagination ✅

Objective:

Stop primary candidate pages from growing indefinitely as historical
data (credit transactions, resume versions) accumulates, without
touching credit ledger behavior or the review lifecycle.

## The history UX rule (new reusable convention)

```text
PRIMARY PAGE                    DEDICATED HISTORY PAGE
current/important info          complete history
small recent preview      -->   server-side pagination
"View all" when it can grow     empty/loading/error states
```

Established by this phase and intended to be the standard pattern for
any future growing list (see ARCHITECTURE.md).

## Credits Centre (`/app/credits`)

- now shows only the 5 most recent transactions, fetched directly as a
  5-row page (never the whole ledger)
- "View all →" appears next to "Recent activity" only when more than 5
  transactions exist
- balances section unchanged

## Credit History (new: `/app/credits/history`)

- complete, server-side-paginated transaction history (default page
  size 20, max 50)
- reuses the existing `CreditTransactionHistory` renderer as-is
- empty/loading/error states; mobile renders as compact rows, not a
  horizontally-scrolling table

## Resume Centre (`/app/resume`)

- `ResumeHistory` now takes an optional `limit` prop: preview mode
  (Resume Centre, `limit={3}`) shows at most 3 recent versions plus
  "View all" when more exist; omitting `limit` renders the full list
  for the history page. One component, two modes -- no duplicate
  implementation.
- current-resume card and review action unchanged

## Resume History (new: `/app/resume/history`)

- complete, server-side-paginated version history (same page-size
  convention as Credit History)
- reuses `ResumeHistory` in full mode plus the shared `Pagination`
  control
- empty state when a candidate has never uploaded a resume

## Pagination

- backend: new `Page[T]` envelope (`app/schemas/pagination.py`),
  deliberately separate from admin's existing `Page[T]`
  (`app/schemas/admin.py`) to avoid a circular import and to leave
  admin untouched -- same shape, same `page`/`page_size` query-param
  convention (default 20, max 50, enforced both by FastAPI `Query(...,
  le=...)` and a defensive `clamp_page_size`)
- new paginated service functions: `credits_service.list_transactions_page`,
  `resume_service.list_resumes_page` -- both additive; the existing
  unbounded `list_transactions` / `list_resumes` are untouched and
  still used where a full in-memory list is actually appropriate
  (e.g. Resume Centre's own "find the latest version" lookup)
- frontend: shared `lib/pagination.ts` `Page<T>` type and a client-side
  `components/Pagination.tsx` control (Previous/Next + "Page X of Y"),
  used identically by both new history Centres -- deliberately not the
  admin area's link-based `features/admin/Pagination.tsx`, since admin
  pages are server components with `searchParams` and candidate pages
  are client components with fetch-on-mount state, matching each
  area's own existing architecture rather than forcing one convention
  across both

## No business-logic changes

Credit ledger writes, review lifecycle, and existing endpoints'
non-paginated behavior are unchanged. `GET /candidate/credits/transactions`
and the new `GET /candidate/resumes/history` are additive/read-only
changes; the only existing response shape that changed is
`/candidate/credits/transactions`, which now returns a `Page` envelope
instead of a bare array (its only consumer, the Credits Centre, was
updated accordingly).

---

# 12.3 Phase 11 — Candidate UI Visual Refinement / PageHero System ✅

Objective:

A visual-hierarchy refinement pass on the candidate-facing application
-- not a new feature. No authentication, RBAC, credits calculation,
review lifecycle, booking, pagination, or database behavior changed in
this phase.

## PageHero (new shared component: `components/PageHero.tsx`)

A reusable "eyebrow + headline metric + optional description/status,
paired with a primary action" blue banner, built on the `.hero-panel`
/ `.hero-eyebrow` / `.hero-title` / `.hero-subtitle` / `.hero-cta` CSS
surface Dashboard (`DashboardHero`) and Mock Interviews already
established in earlier phases. This phase gives Credits, Resume, and
LinkedIn the same pattern instead of three more hand-rolled variants,
and migrates Mock Interviews' hand-rolled hero onto the shared
component (same visible output, less duplication).

Composition used on every page that has one:

```text
Back to <parent>
PAGE TITLE
Short description
    ↓
PageHero (blue): eyebrow + headline metric + primary action
    ↓
Detail card(s) with the full, real data
    ↓
Recent activity / history (unchanged Phase 10 behavior)
```

## Credits Centre (`/app/credits`)

- hero now shows "Available credits" + the real total balance (sum of
  all four credit types' balances -- a display-only aggregation of
  data already fetched, not a new stored/authoritative field) and a
  "View history" action to `/app/credits/history`
- added a "Your credit balances" heading above the existing
  `CreditSummary` breakdown
- Recent activity / View all / empty state unchanged from Phase 10

## Resume Centre (`/app/resume`)

- hero (only when a resume exists) shows the current filename,
  "Version X · Uploaded <date>", and an "Upload new version" action
- that action and the existing "Upload a new version" disclosure now
  share one `isUploadOpen` state in `ResumeCentre` instead of an
  uncontrolled `<details>` element -- same `ResumeUpload` component,
  same upload behavior, just a controlled toggle so the hero button can
  open it too
- `ResumeCard` (filename/version/status/download/review) is unchanged
  and still renders in full below the hero -- the hero is a summary,
  some overlap with the card is intentional (same convention Credits
  already established: hero total + breakdown below)

## LinkedIn Centre (`/app/linkedin`)

- `LinkedInProfileCard` restructured (business logic unchanged) into:
  hero (profile URL + the review-request action) → "Profile details"
  card (icon, URL, Edit URL) → "Profile review" card (status + View
  review), only when a review exists
- the existing `CreditRequirement` component (Phase 9) is relocated
  into the hero's action slot rather than duplicated -- it already was
  presentational-only; `handleRequestReview`/`isRequesting`/`error`
  state in `LinkedInProfileCard` did not change
- `CreditRequirement` gained an additive `variant?: "card" | "hero"`
  prop (default `"card"`, zero behavior change for its existing
  `ResumeCard` usage) so its button/callout use `.hero-cta` white
  styling instead of `.btn-primary` when placed on the hero's blue
  background -- without this, a plain `.btn-primary` button is
  mid-blue-on-blue and nearly invisible

## Mock Interviews (`/app/mock-interviews`)

- hero migrated onto the shared `PageHero` component; same eyebrow/
  metric/"View Credits →"/"Book a Mock Interview" text and behavior
- incidentally fixes a pre-existing contrast bug: the "View Credits →"
  link had no color override and rendered as default link-blue
  (`--color-primary`) on the hero's blue background; it's now explicit
  white, matching every other hero's secondary link

## Dashboard (`/app`) and Profile (`/app/profile`)

Deliberately unchanged. `DashboardHero` (greeting + readiness ring +
next action) and `ProfileHeader` (avatar + ring + completion % + CTA)
were already strong, bespoke "command centre" headers -- adding a
second generic `PageHero` above either would create two competing
banners, which the phase's own brief explicitly rules out.

## History pages / onboarding

`/app/credits/history` and `/app/resume/history` deliberately keep
their existing compact `BackLink` + `PageHeader` treatment, no hero --
they're secondary utility pages. Onboarding is unchanged.

## A known, intentional deviation from the literal design brief

The brief's ASCII mock shows a status chip inside the Resume/LinkedIn
hero (e.g. "Profile added"). That was deliberately omitted: the same
status is already shown immediately below in the detail/review card,
and showing the exact same filename/URL text in both the hero and the
card beneath it already required updating several existing test
assertions from a single-match `getByText`/`findByText` to a
multi-match query (both elements legitimately exist now) -- adding a
third duplicated field for no functional benefit wasn't worth further
widening that diff. See `features/resume/ResumeCentre.test.tsx` and
`features/linkedin/LinkedInCentre.test.tsx` for the updated assertions.

## No business-logic changes

Credit ledger writes, review lifecycle, booking, authentication/RBAC,
and every existing API response shape are unchanged. All changes are
in `apps/web` (components/CSS/JSX structure + the matching test
updates described above); no backend file was touched.

---

# 13. Current Test Status

## Backend

```text
201 / 201 passing
```

Includes:

- authentication matrix
- authorization matrix
- candidate ownership
- admin authorization
- dashboard metrics
- candidate search
- pagination (admin lists, candidate credit history, candidate resume history)
- Candidate 360
- sensitive-data exclusion
- resume review workflows (including RESUME_REVIEW credit enforcement)
- LinkedIn review workflows (including LINKEDIN_REVIEW credit enforcement)
- interview workflows
- slot validation
- credit grants
- credit ledger
- credit-race concurrency (resume/LinkedIn review, mock interview booking)
- validation/error paths

Run against an isolated, throwaway Postgres container rather than the
shared dev database -- see section 18 on why `docker compose exec api
pytest` must not be run casually against the dev stack.

---

## Frontend

```text
223 / 223 passing
```

Includes:

- admin security gate
- dashboard
- candidate list
- Candidate 360
- review queues
- review completion
- mock interview operations
- slot creation
- credit management
- Credits Centre (recent-activity preview, View all behavior)
- Credit History (pagination, empty state)
- Resume Centre history preview (limit, View all behavior)
- Resume History (pagination, empty state)
- resume/LinkedIn credit-aware request UI (sufficient/insufficient states)
- loading states
- error states
- empty states
- validation
- sensitive-data exclusion

---

# 14. Current Code Quality

Backend:

```text
Ruff: clean
Tests: 201/201
```

Frontend:

```text
ESLint: clean
TypeScript: clean
Next.js build: clean
Tests: 223/223
```

---

# 15. Browser / E2E Verification

Phase 8 was manually verified against running Docker containers.

Verified:

- candidate cannot access admin
- unauthenticated admin access redirects appropriately
- admin dashboard shows real metrics
- candidate list shows real candidates
- Candidate 360 loads correctly
- sensitive fields are not rendered
- review queues work
- admin can create interview slots
- admin can grant credits
- candidate receives updated credit balance
- candidate can see admin-recorded interview feedback
- query-string role bypass does not work
- backend independently rejects unauthorized admin API access

---

# 16. Responsive Verification

Admin routes were verified across:

```text
1440
1280
1024
768
430
390
375
```

Verified:

- no horizontal page scrolling
- desktop sidebar
- mobile header
- mobile navigation drawer
- responsive admin routes

---

# 17. Accessibility Status

Automated accessibility testing was performed.

One pre-existing issue remains:

```text
color-contrast
```

Affected elements:

- active sidebar navigation
- primary buttons

This is a shared design-token issue from Phase 6.6.

It was not introduced by Phase 8.

Future fix should be made at the shared design-system/token level.

---

# 18. Known Testing Limitation

Phase 8 browser verification was performed against a persistent development database.

A repeated run caused two fixed-value credit assertions to expect an older balance.

The actual cumulative ledger balance was correct.

This is a test-isolation issue, not a credit-system correctness issue.

Future E2E testing should preferably use:

- isolated database
- reset database
- deterministic fixtures

---

# 19. External Analyzer Products

Separate Resume/LinkedIn Analyzer products already exist.

They remain separate from Launchpad.

Current Launchpad behavior:

```text
Candidate
    ↓
Review Request
    ↓
Manual Review
    ↓
Review Result
```

Future architecture:

```text
Launchpad
    ↓
ReviewService
    ↓
AIAnalyzerProvider
    ↓
External Analyzer
```

Expected future integration:

- authenticated service-to-service API
- asynchronous processing
- job ID
- request/correlation ID
- webhook/callback
- versioned structured result
- Launchpad remains system of record

This integration is NOT currently implemented.

---

# 19.5 Phase 12 — Events & Webinars MVP ✅

**Scope:** Candidate-facing events/webinars list + detail + registration, and admin event management. Deliberately minimal: no external webinar provider integration, no calendar integration, no email reminders, no notifications (Phase 13), no capacity limits.

## Data model (new)

```text
Event
  id, title, description, event_type (WEBINAR|EVENT),
  status (DRAFT|PUBLISHED|CANCELLED -- COMPLETED is derived, never stored),
  starts_at, ends_at, timezone, location, meeting_url,
  created_at, updated_at

EventRegistration
  id, event_id, candidate_profile_id, registered_at, cancelled_at
  uq(event_id, candidate_profile_id) -- the actual duplicate-registration guard
```

`COMPLETED` is never written to `Event.status`; it's derived at read time from `ends_at` (see `app/services/event.py:effective_status`), so no background worker is needed to transition it. Candidates never see `DRAFT` events.

Migration: `d5f5b2c79620_events_event_and_event_registration_.py` (down_revision `c1dccf2ee3d7`).

## Backend

- `app/core/event.py` — `EventType`, `EventStatus`, domain exceptions.
- `app/models/event.py`, `app/models/event_registration.py`.
- `app/services/event.py` — candidate-visible listing, registration (row-locked, IntegrityError-backed idempotency, same pattern as `mock_interview.py:book_interview`), admin create/update/publish/unpublish/cancel.
- `app/api/events.py` — `GET /api/v1/candidate/events`, `GET /api/v1/candidate/events/{id}`, `POST /api/v1/candidate/events/{id}/register`.
- `app/api/admin.py` — `GET/POST /api/v1/admin/events`, `GET/PATCH /api/v1/admin/events/{id}`, `POST .../publish`, `.../unpublish`, `.../cancel`, `GET .../registrations` (reuses the shared `Page[T]` envelope and `_PAGE`/`_PAGE_SIZE` convention).
- Tests: `tests/test_events.py` (22 tests — visibility, draft-hiding, registration idempotency/IDOR, admin CRUD/lifecycle/authorization, invalid-date rejection).

## Frontend

- Candidate: `/app/events` (`EventsCentre` — upcoming grid + quiet past-events list + empty states) and `/app/events/[event_id]` (`EventDetail` — register action, meeting URL withheld until registered).
- Admin: `/admin/events` (list + status filter + pagination, reusing `features/admin/Pagination.tsx`), `/admin/events/new` (create), `/admin/events/[id]` (`EventDetailAdmin` — edit/publish/unpublish/cancel/registrations).
- The candidate dashboard's "Events" entry moved from `FUTURE_MODULES` (placeholder) to a real `EventsModuleCard`, same pattern as Resume/LinkedIn/Mock Interviews.
- No new UI framework, no new pagination system, no new API-proxy pattern -- reuses the existing `/api/candidate/*` and `/api/admin/*` catch-all proxies untouched.
- Tests: `features/events/EventsCentre.test.tsx`, `features/events/EventDetail.test.tsx`, plus updated `app/app/page.test.tsx` for the dashboard module-card change.

## Verified

Backend: 223/223 pytest passing (includes the 22 new event tests) inside the `api` container against the real Postgres container, plus `ruff check .` clean. Frontend: 242/242 Vitest passing, `tsc --noEmit` clean, `next build` clean (all `/app/events*` and `/admin/events*` routes compile), `eslint` clean. End-to-end manual verification via the live Docker stack: registered a candidate, created a superadmin, created a DRAFT event, published it, confirmed it became candidate-visible, and confirmed `/app/events` and `/admin/events` both correctly redirect unauthenticated requests to `/login`. No browser/Playwright tool was available in this session, so no screenshot-based visual verification was performed.

---

# 19.6 Phase 13 — Notifications V1 ✅

**Scope:** In-app-only notification system. No email/push/SMS delivery, no notification preferences, no templates, no admin notification tooling, no Celery/Redis -- deliberately the smallest foundation that four existing workflows can write to and one candidate page can read from.

## Data model (new)

```text
Notification
  id, recipient_user_id (-> users.id), type, title, message,
  read_at (NULL = unread), created_at
```

Recipient is the existing `User` identity, not a duplicated candidate/admin notification table -- a future admin-facing notification type reuses the same row shape. `type` is a Python-side `StrEnum` (`EVENT_REGISTERED`, `MOCK_INTERVIEW_BOOKED`, `RESUME_REVIEW_COMPLETED`, `LINKEDIN_REVIEW_COMPLETED`), same "no Postgres enum" convention as `CreditType`/`CandidateProfile.current_status` -- a new type later is a Python-only change.

Migration: `4077ba4a7f7d_notifications.py` (down_revision `d5f5b2c79620`), with composite indexes `(recipient_user_id, created_at)` (the list query) and `(recipient_user_id, read_at)` (the unread-count query).

## Backend

- `app/core/notification.py` -- `NotificationType`.
- `app/models/notification.py`.
- `app/services/notification.py` -- the single place a `Notification` row is ever constructed (`create_notification`); every business workflow calls one of four type-specific `notify_*` helpers (`notify_event_registered`, `notify_mock_interview_booked`, `notify_resume_review_completed`, `notify_linkedin_review_completed`) rather than constructing rows inline, so a future email/push channel is a change in one module. All four go through `create_notification_safe`, which never raises -- a notification failure is logged and swallowed, never surfaced to the caller (see Failure isolation below). Also: `list_notifications_page`, `count_unread`, `get_owned_notification`, `mark_read` (idempotent), `mark_all_read`.
- `app/api/notifications.py` -- `GET /api/v1/candidate/notifications` (paginated, existing `Page[T]`/`DEFAULT_PAGE_SIZE`/`MAX_PAGE_SIZE` convention), `GET .../unread-count`, `POST .../{id}/read`, `POST .../read-all`. All four derive the authenticated user from `get_current_candidate_profile().user_id` -- never a client-supplied id.
- Tests: `tests/test_notifications.py` (20 tests -- CRUD, pagination, empty state, idempotent mark-read, mark-all-read isolation, IDOR across two candidates, and one integration test per workflow below plus a duplicate-prevention and a failure-isolation test).

## Wired into existing workflows

- **Event registration** (`app/api/events.py:register_for_event`): fires `EVENT_REGISTERED` after the existing registration call succeeds; never on the already-existing 409 duplicate-registration path.
- **Mock interview booking** (`app/api/mock_interviews.py:book_interview`): fires `MOCK_INTERVIEW_BOOKED` after the existing booking call succeeds.
- **Resume/LinkedIn review completion** (`app/api/admin.py:complete_resume_review` / `complete_linkedin_review`): fires `RESUME_REVIEW_COMPLETED` / `LINKEDIN_REVIEW_COMPLETED` after the existing admin completion call succeeds.

No existing service function was changed to call the notification service directly -- each call site is the API route that already orchestrates that workflow, one line after the existing success path.

## Duplicate prevention

Not a new mechanism: every one of the four trigger points already has its own idempotency guard from an earlier phase (event registration's unique constraint, mock interview booking's slot lock, both review-completion endpoints' "already COMPLETED" 409 check) *before* the notification call is ever reached. A retried request never gets past that guard, so it never reaches the notification call a second time -- verified directly (`test_duplicate_event_registration_does_not_duplicate_notification`, `test_resume_review_double_completion_does_not_duplicate_notification`).

## Failure isolation

`create_notification_safe` catches and logs any exception rather than letting it propagate -- the primary operation (registration/booking/completion) has already committed by the time the notification call runs, so a notification failure can never undo or fail that commit. Verified with `test_notification_creation_failure_does_not_break_event_registration` (monkeypatches `create_notification` to raise, asserts registration still returns 201). One implementation note this surfaced: the original implementation also called `await db.rollback()` inside the except block: harmless in isolation, but combined with this project's `NullPool` (see `app/db/session.py` -- one fresh connection per checkout, specifically because Starlette's `TestClient` runs the app on a different event loop than a test's own direct `AsyncSessionLocal()` usage) it could force a new connection checkout from the wrong greenlet context. Removed: `get_db()`'s own `async with AsyncSessionLocal()` already rolls back any uncommitted state on close, making the explicit rollback both redundant and the thing that broke.

## Candidate UI

- `/app/notifications` (`NotificationsCentre`): one chronological list (not split into separate unread/all tabs with their own pagination -- PRD section 10's "avoid unnecessary interaction complexity"), unread items visually distinguished and individually clickable to mark read, "Mark all as read" header action, server-paginated via the existing `components/Pagination.tsx`, `EmptyState`/`ErrorState`/`CentreLoadingSkeleton` reused as-is. Mark-read/mark-all-read are **not** optimistic: local state only changes after the API call succeeds, so a failed request leaves the notification visibly still unread rather than silently drifting out of sync with the backend.
- Sidebar: new "Notifications" nav item (`features/shell/navigation.ts`) with a compact unread-count pill (`features/notifications/NotificationBadge.tsx`, fetched once on mount). `NavLink` gained an additive `badge?: ReactNode` prop (default undefined, zero behavior change for every other nav item) so only the Notifications entry renders one. The mobile bottom tab bar is deliberately untouched -- Phase 9 already fixed its five destinations; the drawer (which renders the full `Sidebar`) is how Notifications reaches mobile.
- New `BellIcon` in `components/icons.tsx`, same hand-rolled 20x20/stroke-1.75 style as every other icon.

## No business-logic changes

Event registration, mock interview booking, and review completion behave exactly as before except for the one additional notification call each makes after already succeeding. No existing API response shape changed.

## Verified

Backend: 243/243 pytest passing (223 existing + 20 new) inside an isolated throwaway Postgres container (not the shared dev stack), `ruff check .` clean. Frontend: 255/255 Vitest passing (242 existing + 13 new), `tsc --noEmit` clean, `eslint` clean, `next build` clean (`/app/notifications` compiles). End-to-end manual verification via the live Docker stack: applied the new migration, registered a candidate, created an admin, created+published an event, registered for it, confirmed the `EVENT_REGISTERED` notification appeared with the correct title/message, confirmed the unread count incremented then dropped to 0 after marking it read, confirmed mark-all-read is a no-op when nothing is unread, confirmed the page renders through the real Next.js proxy under a browser-equivalent cookie session, and confirmed the IDOR/authorization matrix directly over HTTP (unauthenticated 401, wrong-role 403, cross-candidate 404). No browser/Playwright tool was available in this session, so no screenshot-based visual verification was performed; responsive behavior follows the same existing CSS/layout primitives (`EmptyState`, `Pagination`, flex-wrap rows) already verified responsive in earlier phases, with no new horizontally-scrolling element introduced.

---

# 19.7 Phase 13.1 — Notify Candidates When an Event Is Published ✅

**Scope:** Small follow-up to Phase 13. When an ADMIN/SUPER_ADMIN publishes an event (DRAFT -> PUBLISHED), active candidates receive an in-app `EVENT_PUBLISHED` notification linking to the event detail page. No new notification model, no email/push/SMS, no audience targeting, no background workers.

## Data model (additive)

```text
Notification.event_id  -- nullable FK -> events.id, ondelete SET NULL
```

The only schema change: the existing Phase 13 `Notification` row had no field that could reference the event it's about. `event_id` is deliberately generic (not `EVENT_PUBLISHED`-specific) so any future event-related notification type can reuse it. Migration: `9e3f6a2b1c7d_notifications_event_id.py` (down_revision `4077ba4a7f7d`). `NotificationType.EVENT_PUBLISHED` added to the existing Python-side `StrEnum` -- no migration needed for that part, same as every other notification type.

## Backend

- `app/services/notification.py`:
  - `create_notification`/`create_notification_safe` gained an additive optional `event_id` parameter (defaults `None`, zero behavior change for the four existing `notify_*` callers).
  - `get_active_candidate_user_ids(db)` -- `User` join `UserRole` join `Role` where `Role.name == "CANDIDATE"` and `User.is_active`. This is the "active candidate" definition used (the project's only existing active-flag is `User.is_active`; `CandidateProfile.current_status` is an unrelated career-stage field, not an account-active flag).
  - `notify_event_published_bulk(db, recipient_user_ids, event_id=..., event_title=...)` -- fans the notification out to many candidates with a single multi-row `insert(Notification).values([...])` statement (one commit, not one per recipient), the same bulk-insert idiom `app/services/roles.py:seed_roles` already established for `Role`. Never raises: wrapped in the same catch-and-log failure-isolation pattern as `create_notification_safe`, since event publication has already committed by the time this runs.
- `app/api/admin.py:publish_event` -- captures `was_draft = event.status == EventStatus.DRAFT` *before* calling `event_service.set_event_status`, and only fans out notifications when `was_draft` is true. This is the idempotency guard: the route already tolerates re-POSTing `/publish` on an already-PUBLISHED event (returns 200, no-op status-wise), and without this guard every re-publish would re-notify every candidate.
- `app/schemas/notification.py:NotificationRead` gained `event_id: uuid.UUID | None`.
- Tests: 7 new tests in `tests/test_events.py` (draft doesn't notify, publish notifies all active candidates, ADMIN/SUPER_ADMIN excluded, non-candidate roles (INTERVIEWER) excluded, re-publish doesn't duplicate, multiple candidates each get exactly one, publish succeeds even when the notification fan-out's own try/except path is exercised).

## Frontend

- `lib/notifications/types.ts` -- `NotificationType` gained `"EVENT_PUBLISHED"`; `Notification` gained `event_id: string | null`.
- `lib/notifications/labels.ts` -- `EVENT_PUBLISHED: "New Event"` badge label.
- `lib/notifications/destinations.ts` (new, small) -- a notification-type -> destination-route map, `getNotificationDestination(notification)`. Only `EVENT_PUBLISHED` resolves to a destination (`/app/events/{event_id}`) today; every other type returns `null` (click = mark-as-read only, as before). Deliberately a type -> function map rather than hardcoded per-type branching inside the list component, so a future notification type with a destination is a one-line addition here, not a change to `NotificationList`.
- `features/notifications/NotificationList.tsx` -- added a small leading icon (reusing the existing `CalendarIcon`) for notification types present in a `NOTIFICATION_TYPE_ICONS` map (only `EVENT_PUBLISHED` has one; every other type renders exactly as before, no icon). Clicking a row now also navigates via `useRouter().push(...)` when `getNotificationDestination` resolves a destination; an already-read `EVENT_PUBLISHED` row (previously a static, non-interactive `<li>`) is now also clickable purely to navigate, without re-triggering mark-as-read. `/app/notifications` itself (tabs, pagination, mark-all-read) is untouched.
- Tests: new `features/notifications/NotificationList.test.tsx` (icon presence/absence, navigation on click for unread/read EVENT_PUBLISHED rows, no navigation for types without a destination); `NotificationsCentre.test.tsx` updated with a `next/navigation` mock and an `event_id` field on its notification fixture.

## Security / IDOR

No new surface: `GET /candidate/notifications` already derives `recipient_user_id` from the authenticated session (never client-supplied), so an `EVENT_PUBLISHED` notification is only ever readable by the candidate it was created for. The linked event is always one that was just transitioned to PUBLISHED by this same request, so the candidate's own existing `GET /candidate/events/{id}` authorization (DRAFT events already hidden from candidates) governs what the destination route can show -- no admin-only field is exposed through the notification.

## Verified

Backend: 250/250 pytest passing (243 existing + 7 new) inside an isolated throwaway Postgres container (not the shared dev stack), `ruff check .` clean, `alembic current` confirms head `9e3f6a2b1c7d`. Frontend: 266/266 Vitest passing (261 existing + 5 new, in the new `NotificationList.test.tsx`), `tsc --noEmit` clean, `eslint` clean, `next build` clean. Live verification against the running Docker dev stack (rebuilt `api`/`web` images, migration applied automatically on container start): registered a candidate and an admin, created a DRAFT event, confirmed zero notifications/unread-count for the candidate, published it, confirmed the candidate received exactly one `EVENT_PUBLISHED` notification referencing the correct `event_id` and unread-count incremented to 1, confirmed the linked event detail resolves via the candidate's own events endpoint, marked it read and confirmed unread-count returned to 0, then re-published the already-PUBLISHED event and confirmed no duplicate notification was created. Test data (both users, the test event) was deleted afterward.

---

# 20. Explicitly Deferred Features

The following are NOT currently implemented:

```text
AI Resume Analysis
AI LinkedIn Analysis
Payments
Credit purchases/packages
Email notification workflows
Push notifications
SMS/WhatsApp notifications
Notification preferences/templates/campaigns
Admin notification management
Events: external webinar providers (Zoom/Teams integration)
Events: calendar integration
Events: email reminders
Events: capacity limits
Recruiter portal
Interviewer portal
Career Coach portal
Job recommendations
AI job matching
Application tracking
Placement tracking
Ellow talent integration
```

Do not implement these unless the active phase explicitly requires them.

---

# 21. Infrastructure Not Currently Required

The current Launchpad architecture intentionally does not use:

```text
Redis
Celery
Background workers
S3
MinIO
Payment infrastructure
```

Do not add these simply for future scalability.

Infrastructure should be introduced only when the active product requirement needs it.

---

# 22. Frontend Architecture Decision

The project intentionally uses the existing CSS/design-system architecture.

Do NOT retrofit:

```text
Tailwind
shadcn/ui
MUI
Chakra
Bootstrap
```

The separate frontend specification may be used as a UX/reference document, but it does not override the actual Launchpad architecture.

Useful practices may be adopted where compatible, including:

- loading states
- empty states
- error states
- accessibility
- responsive design
- service boundaries
- centralized constants
- status enums

Do not rewrite the application to match an alternate frontend architecture without an explicit architectural decision.

---

# 23. Git Status / Immediate Cleanup

At the end of Phase 8, the implementation report indicated that:

- Phase 6.6 changes were still uncommitted
- Phase 7 changes were still uncommitted
- Phase 8 changes were still uncommitted

There were approximately 88 changed/new files across those phases.
Phases 9 and 10 have since been implemented on top of that same
uncommitted state and are themselves still uncommitted.

### Required next step

Do NOT start Phase 11 yet.

First:

```text
1. Inspect git status
2. Inspect git diff
3. Identify Phase 6.6 files
4. Identify Phase 7 files
5. Identify Phase 8 files
6. Identify ambiguous files
7. Review the grouping
8. Commit Phase 6.6 separately
9. Commit Phase 7 separately
10. Commit Phase 8 separately
11. Tag phases according to project convention
12. Verify clean git status
```

Do not blindly create one giant commit.

---

# 24. Current Phase State

```text
Phase 1      Foundation                  ✅
Phase 2      Authentication + RBAC       ✅
Phase 3      Candidate Identity          ✅
Phase 4      Candidate Dashboard         ✅
Phase 5      Resume Centre               ✅
Phase 6      LinkedIn Centre             ✅
Phase 6.6    Design System               ✅
Phase 7      Credits + Mock Interviews   ✅
Phase 8      Admin + Candidate 360       ✅
Phase 9      Platform-Wide Credits       ✅
Phase 10     History UX / Pagination     ✅
Phase 11     Candidate UI Visual Refinement ✅
Phase 12     Events & Webinars MVP       ✅
Phase 13     Notifications V1            ✅
Phase 13.1   Event Published Notifications ✅
```

---

# 25. Current Position

```text
                    MVP CORE
                       │
                       ▼
             Candidate Platform
                       │
          ┌────────────┴────────────┐
          │                         │
     Candidate UI              Admin UI
          │                         │
          ▼                         ▼
 Profile / Resume /          Candidate 360
 LinkedIn / Interviews       Reviews / Credits
          │                         │
          └────────────┬────────────┘
                       │
                       ▼
                  PostgreSQL
```

Core candidate and admin operational functionality is now implemented through Phase 10, with the candidate UI visually refined in Phase 11.

---

# 26. Next Step

The next task is NOT a new product phase.

First perform Git cleanup (still outstanding -- this predates Phase 11
and Phase 11's own changes should become their own additional commit,
not be folded into any of these):

```text
Phase 6.6  → separate commit
Phase 7    → separate commit
Phase 8    → separate commit
Phase 9    → separate commit
Phase 10   → separate commit
Phase 11   → separate commit
```

After the repository is clean and the project-control documents are committed:

```text
CLAUDE.md
ARCHITECTURE.md
PROJECT_STATUS.md
```

review the PRD and determine the next phase.

Do not assume a Phase 12 scope until explicitly decided.

---

# 27. Claude Session Startup

Every fresh Claude session should begin with:

```text
Read CLAUDE.md.

Read PROJECT_STATUS.md.

Read ARCHITECTURE.md if the task involves architecture or an existing
system boundary.

Inspect the actual repository before making assumptions.

Implement only the requested task.

Do not start the next phase automatically.
```

For a large but continuous task, `/compact` may be used.

For a new unrelated task or phase, prefer a fresh Claude session.

---

# 28. Source of Truth

Use the documents as follows:

```text
CLAUDE.md
    ↓
Development rules

ARCHITECTURE.md
    ↓
Technical architecture

PROJECT_STATUS.md
    ↓
Current project state

Source code
    ↓
Actual implementation truth
```

If documentation conflicts with the source code:

1. inspect the source code
2. determine the actual implementation
3. do not silently assume
4. update the appropriate documentation after confirming the intended architecture
