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