# Ellow Launchpad — Architecture

## 1. Document Purpose

This document describes the actual technical architecture of Ellow Launchpad.

It is the technical source of truth for:

- application boundaries
- frontend architecture
- backend architecture
- authentication
- authorization
- database architecture
- domain services
- candidate workflows
- review workflows
- credit architecture
- mock interviews
- admin architecture
- security boundaries
- current infrastructure assumptions
- future external Analyzer integration

This document describes what is currently implemented unless explicitly marked as FUTURE.

---

# 2. Product Overview

Ellow Launchpad is a candidate career-readiness platform.

The platform allows candidates to:

- create an account
- complete their profile
- submit education/work/skills information
- define career preferences
- upload resumes
- submit LinkedIn profiles
- request resume/LinkedIn reviews
- receive mock interview credits
- book mock interviews
- receive interview feedback

The platform also provides operational capabilities for administrators:

- dashboard metrics
- candidate management
- Candidate 360
- resume review operations
- LinkedIn review operations
- mock interview operations
- credit management

---

# 3. Current Runtime Architecture

Current runtime:

Browser
    ↓
Next.js
    ↓
FastAPI
    ↓
PostgreSQL

The browser interacts with the Next.js application.

Next.js handles the frontend application and API/proxy boundary.

FastAPI provides the application API and business/domain services.

PostgreSQL is the system of record.

---

# 4. Monorepo Structure

Current repository structure:

```text
launchpad/
├── apps/
│   ├── web/
│   │   └── Next.js application
│   │
│   └── api/
│       └── FastAPI application
│
├── packages/
│
├── infra/
│
├── docker-compose.yml
├── Makefile
├── CLAUDE.md
├── ARCHITECTURE.md
├── PROJECT_STATUS.md
└── README.md
```

---

# 5. Credit Architecture

Credits are a ledger-based wallet, generic across four types:
`MOCK_INTERVIEW`, `CAREER_COACHING`, `RESUME_REVIEW`, `LINKEDIN_REVIEW`.

```text
CreditTransaction (append-only)
    ↓
SUM(amount) per candidate per credit_type
    ↓
Balance (derived, never a stored column)
```

There is no mutable balance field anywhere. A balance is always
`SUM(amount)` over a candidate's `credit_transactions` rows for that
credit type (`app/services/credits.py:get_balance`).

Any flow that spends a credit follows the same pattern, established in
Phase 7 (`mock_interview_service.book_interview`) and reused as-is by
Phase 9 for Resume Review and LinkedIn Review
(`resume_review.request_review`, `linkedin_review.request_review`):

```text
lock the candidate's own profile row (`SELECT ... FOR UPDATE`)
    ↓
verify the balance covers the cost
    ↓
create the debit transaction + the thing it pays for, in one flush
    ↓
commit together, or roll back together
```

The row lock serializes concurrent spend attempts for that one
candidate (other candidates are unaffected), and the single
flush/commit means a failure after the debit is added never leaves the
candidate charged without the thing they paid for -- there is nothing
to "roll back" after the fact because nothing was committed yet.

Credits are never granted through a candidate-facing endpoint (no
payment system exists yet); grants only happen through the credit
service, called from admin routes or internal/test setup.

CAREER_COACHING has no consuming workflow yet -- it exists only as a
wallet type, reserved for a future phase.

---

# 6. History UX & Pagination

Any candidate-facing list that grows without bound over time (credit
transactions, resume versions, and whatever comes after) follows the
same two-screen convention, established in Phase 10:

```text
PRIMARY PAGE                       DEDICATED HISTORY PAGE
  current/important info             complete history
  small recent preview    -- View all -->  server-side pagination
  (no unbounded render)              own loading/empty/error states
```

The primary page never renders more than a small, fixed preview (e.g.
5 recent credit transactions, 3 recent resume versions) and never
grows as history accumulates. A "View all" link, shown only when more
exists, is the single way into the dedicated history page for that
list.

A full history is never fetched as one unbounded list, in the browser
or otherwise. Every dedicated history page paginates server-side using
one shared envelope:

```text
Page[T] = { items: T[], total: int, page: int, page_size: int }
```

This is the same shape admin's `app/schemas/admin.py:Page[T]` already
established in Phase 8; candidate routes define their own copy in
`app/schemas/pagination.py` rather than importing admin's (admin.py
already imports candidate schemas like `CreditTransactionRead`, so the
reverse import would be circular) -- same contract, same
`page`/`page_size` query params (default 20, max 50), independent
modules.

A component that needs to serve both the compact preview and the full
history should support both through one reusable implementation rather
than two: see `features/resume/ResumeHistory.tsx`, which takes an
optional `limit` prop (preview mode, with a "View all" link when
`resumes.length > limit`) and renders the full given list when `limit`
is omitted (full mode, fed one server-side page at a time by the
history Centre).

Candidate-facing history pages are client components with their own
fetch-on-mount + page state (`useState`/`useEffect`, matching every
other `*Centre`), paired with the client-side
`components/Pagination.tsx` control (Previous/Next, callback-driven).
This is deliberately not the admin area's `features/admin/Pagination.tsx`,
which is link-based (`?page=`) because admin list pages are server
components reading `searchParams` -- a different, equally valid
pattern for a different rendering model. Pick the pagination control
that matches the page's own architecture rather than mixing the two.

---

# 7. PageHero -- Candidate Page Hierarchy

Established in Phase 11. A major candidate page (one with real,
page-specific "current state" to show -- Credits, Resume, LinkedIn,
Mock Interviews) follows:

```text
Back to <parent>                    (components/BackLink.tsx)
PAGE TITLE + short description      (components/PageHeader.tsx)
    ↓
PageHero (components/PageHero.tsx): a blue `.hero-panel` banner --
  eyebrow + headline metric (+ optional description/status), paired
  with the page's one primary action
    ↓
Detail card(s) with the full, real data and secondary actions
    ↓
Recent activity / history preview (Phase 10's convention) -- "View all"
  to the dedicated history page when more exists
```

`PageHero` is the single shared implementation of the blue "contextual
summary" banner pattern `DashboardHero` and Mock Interviews'
hand-rolled hero both originated independently; Credits, Resume, and
LinkedIn's heroes and Mock Interviews' hero are now all the same
component with different props, not four parallel hand-rolled
variants. `DashboardHero` and `ProfileHeader` remain their own bespoke
components -- each was already a strong, page-specific "command
centre" header before Phase 11, and a page never has two competing
hero/banner sections.

Secondary/utility pages (`/app/credits/history`, `/app/resume/history`,
onboarding steps) deliberately do not get a `PageHero` -- just
`BackLink` + `PageHeader`, kept compact.

A component normally used inside a white `.card` can be reused inside
a `PageHero`'s action slot without duplicating its logic, as long as
it accepts a presentational `variant` (see
`features/credits/CreditRequirement.tsx`'s `variant?: "card" | "hero"`):
a plain `.btn-primary` renders as a visually clashing mid-blue button
on the hero's blue background, so the `"hero"` variant swaps it for
the white `.hero-cta` treatment instead. This is a styling switch only
-- the underlying state/handlers the caller passes in do not change.

---

# 8. Notifications -- Centralized, Failure-Isolated Side Effects

Established in Phase 13. `Notification` rows are read by one candidate
page (`/app/notifications`) and written from several unrelated
workflows (event registration, mock interview booking, resume/LinkedIn
review completion), so the write path follows two rules every future
notification-producing workflow should also follow:

```text
Primary operation (register / book / complete review)
    ↓ already committed
notification_service.notify_*(...)   <- one line, after success
    ↓
create_notification_safe(...)         <- never raises
```

**Centralized construction.** No business service constructs a
`Notification(...)` row itself. Each trigger point calls one of
`app/services/notification.py`'s type-specific `notify_*` helpers
(`notify_event_registered`, `notify_mock_interview_booked`,
`notify_resume_review_completed`, `notify_linkedin_review_completed`),
which all funnel through the single `create_notification` constructor.
A future delivery channel (email/push) is a change inside this one
module, not a hunt across every workflow that can trigger a
notification.

**Failure isolation.** `create_notification_safe` catches and logs any
exception rather than letting it propagate. Every `notify_*` call site
is placed *after* the primary operation's own commit, so a
notification failure can never undo or fail that commit -- the
candidate still gets registered/booked/reviewed even if the
notification itself can't be written. This mirrors the general
principle (also true of credit debits -- see section 5) that a
side effect must never become a reason the primary operation fails,
but the mechanism here is "catch and log" rather than "same
transaction," since a notification has no correctness requirement that
would justify failing the primary action over it.

**Duplicate prevention is inherited, not reinvented.** Every current
trigger point already had its own idempotency guard from an earlier
phase (event registration's unique constraint, mock interview
booking's slot lock, both review-completion endpoints' "already
COMPLETED" check) before Phase 13 existed. A retried request is
rejected by that existing guard before it ever reaches the
notification call, so no separate notification-level duplicate check
was added. A future trigger point without an existing idempotency
guard would need one of its own for the same reason -- not a
notification-specific unique constraint.

**Bulk fan-out (Phase 13.1).** `EVENT_PUBLISHED` is the first
notification type with many recipients instead of one (every active
candidate, not the one candidate who just acted). Looping the
single-row `create_notification_safe` would mean one commit per
recipient, so `notify_event_published_bulk` instead issues a single
multi-row `insert(Notification).values([...])` -- the same bulk-insert
idiom `app/services/roles.py:seed_roles` already established for
`Role` -- wrapped in the same catch-and-log failure-isolation contract
as `create_notification_safe`. The "DRAFT -> PUBLISHED only" idempotency
check (not every transition into PUBLISHED) lives in the route
(`app/api/admin.py:publish_event`, which captures the pre-transition
status before calling `set_event_status`), not in the service layer,
since `set_event_status` is a generic setter with no transition
history of its own.

**Notification -> destination (Phase 13.1).** `Notification` gained an
optional `event_id` (nullable FK, `ondelete=SET NULL`) -- generic
enough for any future event-related notification type, not a
one-off field. On the frontend, `lib/notifications/destinations.ts`
maps notification type -> an optional destination route rather than
hardcoding per-type navigation inside `NotificationList`; a type with
no entry in that map stays purely informational (click = mark as
read only), which is still true for every notification type except
`EVENT_PUBLISHED`.

---

# 9. Email-Verified Registration (Phase 14)

Candidate registration is no longer a single step. No `User` row is
created until the candidate has proven ownership of the email address:

```text
POST /auth/register/start     -- email in, OTP sent, registration_token out
        v
POST /auth/register/verify    -- OTP in, pending registration marked verified
        v
POST /auth/register/complete  -- password in, User created (existing
                                  register_user service, unchanged)
```

**`PendingRegistration` is a workflow row, not a second user table.**
It holds an email, an argon2 hash of a 6-digit OTP, an expiry, an
attempt counter, and a `verified_at` marker -- never a plaintext OTP
and never a password. `app/services/registration.py` is the only code
that reads/writes it; `complete_registration` hands off to the
existing `auth_service.register_user` for the actual account creation
rather than re-implementing password hashing, role assignment, or
duplicate-email race handling a second time.

**The registration token is a second JWT `type`, not a second JWT
mechanism.** `create_pending_registration_token`/
`decode_pending_registration_token` (`app/core/security.py`) reuse the
same signing key and `jwt.encode`/`decode` calls as access tokens, just
tagged `type: "pending_registration"` instead of `type: "access"`.
Because `decode_access_token` rejects any token whose `type` isn't
`"access"`, a registration token can never authenticate a request, and
an access token can never be replayed into the registration endpoints
-- the two token types are mutually exclusive by construction, not by
an extra allowlist check.

**Email delivery is a swappable boundary, same shape as resume
storage.** `app/services/email.py` defines an `EmailService` Protocol;
`ConsoleEmailService` (the default -- logs instead of sending, so
dev/CI need zero configuration) and `SMTPEmailService` (configured
entirely through env vars) both implement it. A future transactional
email provider is a new class implementing `EmailService`, not a
change to `app/services/registration.py` -- the same relationship
`app/services/resume_storage.py`'s `ResumeStorage` already established
between `app/services/resume.py` and local-disk-vs-S3. `EMAIL_PROVIDER`
selects the instance: `console` (default), `smtp`/`mailtrap` (both
currently resolve to `SMTPEmailService` -- Mailtrap's dev/staging
testing inboxes are SMTP-credentialed, not API-token-credentialed, so
they fit the generic SMTP class rather than needing Mailtrap's own
SDK). `resend` is reserved for a future `ResendEmailService` for
production; selecting it today is not yet implemented.

**Email enumeration is closed by making `/register/start` take the
same path either way.** Whether or not the submitted email already
belongs to a confirmed account, `/register/start` returns the same
response shape and the caller receives a structurally identical
registration token. When the email is already taken, no
`PendingRegistration` row is created and no OTP is ever sent, so the
token is simply never verifiable -- the same generic
"invalid or expired" error a wrong/expired OTP on a real pending
registration would also produce. There is no separate code path whose
presence/absence or response could be used to probe which emails are
already registered.

**No scheduled cleanup job.** A `PendingRegistration` row for a given
email is reused (its OTP reissued) the next time that email starts
registration, rather than left to accumulate and swept by a cron job
-- consistent with this phase's scope rule against introducing
background-worker infrastructure for a problem a request-time check
already solves.

**Known gap, not a silent one:** the pre-existing `POST /auth/register`
endpoint (instant creation, no verification) was intentionally left in
place rather than removed or gated, because it is the fixture the rest
of the backend test suite uses to create test users
(`tests/helpers.py`). The invariant "no account before verification"
therefore holds for the candidate-facing frontend flow, not for the
backend API surface as a whole -- see PROJECT_STATUS.md section 19.8
for the full tradeoff.

---

# 10. Guided First-Login Onboarding (Phase 15)

```text
Login
    v
Finished onboarding?  -- derived from the existing
                          profile_completion/next_action dashboard
                          data, not a stored "first login" flag
    v no                          v yes
/onboarding                       /app
    v
About -> Education -> Skills -> Work Experience ->
Career Interests -> Career Goal   (profile completion, 6 components)
    v
Resume -> LinkedIn                (optional "Career Assets")
    v
Onboarding hub: completion state + recommended next step
```

**"Finished onboarding" has no persisted flag -- it's the same
derived state the dashboard already computes.** The login route
(`apps/web/app/api/auth/login/route.ts`) calls the same
`getServerDashboard` the `/app` and `/onboarding` pages already call,
and only overrides the plain-candidate `/app` destination with
`/onboarding` when `next_action.type !== "PROFILE_COMPLETE"`. There is
nothing to keep in sync and no separate flag that could drift from
reality; a dashboard fetch failure falls back to the pre-existing
`/app` destination rather than risking a redirect loop. Admins and
other non-candidate roles are untouched -- see `isCandidateUser` in
`apps/web/lib/auth/roles.ts`.

**Profile completion (6 required components) and "Career Assets"
(Resume, LinkedIn) are deliberately separate concepts, in both UX and
code.** `ONBOARDING_STEPS` (`apps/web/features/onboarding/steps.ts`)
lists only the six profile-completion steps -- About, Education,
Skills, Work Experience, Career Interests, Career Goal -- which is
what drives the step rail, the mobile stepper, and
`buildOnboardingJourney`'s completion math. Resume and LinkedIn are
separate routes (`/onboarding/resume`, `/onboarding/linkedin`) reached
only by linear navigation after Career Goal; they are never added to
`ONBOARDING_STEPS` and never factor into the completion percentage.
This mirrors the backend's `profile_completion.py`, which has never
counted Resume/LinkedIn and wasn't changed here.

**Onboarding does not reimplement Resume Centre or LinkedIn Centre --
it's a first-time entry point into them.** The Resume and LinkedIn
onboarding steps call the exact same client functions and components
as their respective Centres (`ResumeUpload`/`uploadResume`,
`LinkedInUrlForm`/`saveLinkedInUrl`, `requestReview`/
`requestLinkedInReview` + `CreditRequirement` for an explicit review
request). Uploading/saving never touches credits; a credit is only
ever debited by the pre-existing, unchanged
`resume_review.py`/`linkedin_review.py` services, which the onboarding
step's "Request Review" button calls exactly as the Centre's own
button does. "Skip" / "I'll do this later" on these two steps simply
navigates on without calling any API -- a skipped asset is picked up
later by the dashboard's/onboarding hub's existing
`buildPostOnboardingRecommendation` (Resume -> LinkedIn -> Mock
Interview -> Dashboard), not by forcing the candidate back through
onboarding on a later login.

**Work Experience is a profile-completion component with no
dedicated onboarding step before this phase** (it was `/app/profile`
in `next_action.py`'s `WORK_EXPERIENCE` route). It now has one
(`/onboarding/experience`), inserted between Skills and Career
Interests, which reuses `features/profile/WorkExperienceSection` and
`ExperienceForm` exactly as the profile page does -- a server-rendered
page passes the fetched experience list down as a prop, and
`ExperienceForm`'s pre-existing `router.refresh()` re-fetches it, the
same mechanism the profile page already relied on. Because
`ExperienceForm` renders its own `<form>`, `OnboardingStepShell` gained
an optional `useForm={false}` mode (default `true`, every other step
unchanged) so this step doesn't nest one `<form>` inside another.
Continuing past this step never requires an entry to exist, matching
the Skills step's existing permissiveness -- a candidate with no work
experience can continue and simply remains below 100% completion,
which the dashboard already surfaces honestly rather than silently.