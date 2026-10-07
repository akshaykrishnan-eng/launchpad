# Ellow Launchpad — Claude Development Rules

## 1. Purpose

Ellow Launchpad is a candidate career-readiness platform.

Launchpad currently provides:

- Authentication
- Candidate onboarding
- Candidate profile
- Resume management
- LinkedIn profile submission
- Resume and LinkedIn review workflows
- Mock interview credits
- Mock interview booking
- Mock interview feedback
- Candidate dashboard
- Admin dashboard
- Candidate 360
- Admin review operations
- Admin interview operations
- Admin credit management

The repository is the source of truth for the current implementation.

Do not assume that a feature exists because it appears in a future product requirement or architecture document. Verify the actual code before using or modifying it.

---

# 2. Permanent Technology Stack

## Frontend

- Next.js
- App Router
- TypeScript
- Existing Launchpad CSS/design-system architecture

Do NOT introduce:

- Tailwind CSS
- shadcn/ui
- Radix UI as a new UI framework
- Material UI
- Chakra UI
- Bootstrap
- another frontend component framework

The existing design system must be reused.

## Backend

- Python
- FastAPI
- SQLAlchemy async
- Alembic
- PostgreSQL

## Runtime

Browser
→ Next.js
→ FastAPI
→ PostgreSQL

Docker is used for local development.

---

# 3. Frontend Design System

Use the existing Launchpad design system.

Primary:

#336CFC

Main text:

#222222

Secondary/sidebar/icon text:

#585858

Do not create a second visual language for individual modules.

Reuse existing:

- PageHeader
- cards
- buttons
- form controls
- status badges
- loading states
- error states
- empty states
- responsive navigation
- sidebar
- mobile navigation
- typography
- spacing
- design tokens

If a new UI pattern is required, first check whether an existing component can be reused.

Do not introduce a new UI framework to solve a component problem.

---

# 4. Architecture

The current application architecture is:

Browser
    ↓
Next.js
    ↓
FastAPI
    ↓
PostgreSQL

The frontend communicates with the backend through the existing API/proxy architecture.

The backend follows:

API route
    ↓
Service/domain logic
    ↓
Repository/ORM/database operations

API routes must remain thin.

Business rules belong in services/domain logic, not route handlers.

See ARCHITECTURE.md for the detailed architecture.

---

# 5. Backend Rules

## Thin API handlers

Do not place business logic directly inside FastAPI route handlers.

Routes should:

1. authenticate/authorize
2. validate request
3. call the appropriate service
4. return the appropriate response

Avoid raw database mutations directly inside route handlers.

Reuse existing services whenever possible.

---

# 6. Database Rules

PostgreSQL is the system of record.

Use SQLAlchemy async models and Alembic migrations.

Never modify an existing migration that has already been applied.

Create a new migration when a real schema change is required.

Before creating a migration:

- inspect existing models
- inspect existing migrations
- verify whether the schema actually needs changing

Do not create migrations for Python-only relationships that do not change the database schema.

After schema changes:

- run migrations
- verify migration head
- run tests

---

# 7. Authentication

Launchpad uses:

- short-lived JWT access tokens
- opaque refresh tokens
- hashed refresh-token storage
- refresh-token rotation
- refresh-token reuse detection
- HttpOnly cookies where applicable

Access tokens do not contain authorization roles as the source of truth.

User roles are re-read from the database during authorization.

Never trust:

- client-provided role
- query-string role
- client-provided user ID
- client-provided candidate ID for ownership

Authentication and authorization must be enforced server-side.

---

# 8. RBAC

Supported roles:

- CANDIDATE
- INTERVIEWER
- CAREER_COACH
- RECRUITER
- ADMIN
- SUPER_ADMIN

Current admin access:

ADMIN
SUPER_ADMIN

Admin authorization is enforced by the backend.

Frontend route guards are UX protection only.

Never treat frontend route protection as the security boundary.

---

# 9. Ownership and IDOR Prevention

Authenticated candidate endpoints must derive the current user/candidate from the authenticated session.

Do not accept a candidate/user ID from the client when it can be derived from authentication.

Every resource access must be authorized server-side.

Do not introduce:

- `?user_id=...` ownership bypasses
- `?role=...` role bypasses
- client-controlled authorization
- hidden admin endpoints without backend authorization

---

# 10. Candidate Data

Launchpad owns the candidate identity and profile system.

Candidate information includes:

- User
- CandidateProfile
- Education
- WorkExperience
- Skills
- CareerPreferences
- Resume
- LinkedIn profile
- Reviews
- Mock interviews
- Credits

Candidate 360 is an admin read-oriented aggregation of this information.

Never expose:

- password hashes
- refresh-token hashes
- access tokens
- authentication secrets

through candidate or admin response schemas.

---

# 11. Review Architecture

Launchpad owns the review workflow.

Current review workflow:

Candidate
    ↓
Review Request
    ↓
Manual HR/Admin Review
    ↓
Review Result
    ↓
Candidate sees result

Current review types:

- Resume
- LinkedIn

Current human review completion must use the existing review service.

Do not duplicate review business logic in admin routes.

Current MVP does NOT include AI Analyzer integration.

The separate Resume/LinkedIn Analyzer products remain separate systems.

---

# 12. Future Analyzer Integration

The external Analyzer products are separate from Launchpad.

Do NOT rebuild them inside Launchpad.

Future architecture:

Launchpad
    ↓
ReviewService
    ↓
AIAnalyzerProvider
    ↓
External Analyzer

Expected future characteristics:

- separate service
- separate database
- authenticated service-to-service communication
- asynchronous analysis
- job/request ID
- callback/webhook
- correlation/request ID
- versioned structured result
- Launchpad remains the system of record

Candidate users must never call the Analyzer directly.

Do not implement this integration unless the current phase explicitly requires it.

---

# 13. Credit Architecture

Credits use a ledger-based model.

Do NOT introduce a mutable authoritative balance field as the source of truth.

Credit transactions represent changes.

Examples:

- SIGNUP_BONUS
- ADMIN_ADJUSTMENT
- PROMOTIONAL_GRANT
- INTERVIEW_BOOKED
- INTERVIEW_CANCELLED_REFUND

Balances are derived from the ledger/service layer.

Admin credit grants must use the existing credit service.

Never directly mutate a candidate's credit balance from an API route.

---

# 14. Mock Interview Architecture

Mock interview lifecycle currently uses:

BOOKED
COMPLETED
CANCELLED

Do not add unnecessary states without a product requirement.

Slot creation and interview completion must use existing services.

Interview feedback includes validated scoring.

Existing booking protections and idempotency rules must be preserved.

---

# 15. Admin Architecture

Admin routes live separately from candidate routes.

Current admin routes include:

/admin
/admin/candidates
/admin/candidates/[id]
/admin/resume-reviews
/admin/resume-reviews/[id]
/admin/linkedin-reviews
/admin/linkedin-reviews/[id]
/admin/mock-interviews
/admin/mock-interviews/[id]
/admin/credits

Admin API access is restricted to:

- ADMIN
- SUPER_ADMIN

Admin functionality must reuse existing domain services.

Do not duplicate candidate business logic inside admin modules.

---

# 16. Candidate 360

Candidate 360 is a read-oriented aggregation.

It may include:

- identity/profile
- education
- skills
- work experience
- career preferences
- resumes
- resume review
- LinkedIn
- LinkedIn review
- mock interviews
- credit balances

Candidate 360 must never expose authentication secrets.

Candidate 360 should not become a second source of truth.

---

# 17. File Storage

Resume storage is accessed through backend-controlled storage services.

Do not expose internal storage keys directly to the frontend.

Authenticated downloads must pass through appropriate authorization.

Do not expose permanent unrestricted file URLs.

---

# 18. API Conventions

Use existing API versioning and response conventions.

Validate input through Pydantic schemas.

Use appropriate HTTP status codes.

Examples:

- 401 unauthenticated
- 403 unauthorized
- 404 resource not found
- 409 state/conflict error
- 422 validation error

Do not silently convert domain errors into generic success responses.

---

# 19. Frontend Data Access

Components should not contain duplicated API/business logic.

Use the existing frontend API/service abstractions where available.

Do not introduce a second API access pattern without a clear reason.

Keep server communication separate from presentation.

---

# 20. UI State Requirements

Data-driven UI should handle:

- loading
- success
- empty
- error
- retry where appropriate

Forms should:

- preserve user input on failure
- show useful validation messages
- prevent duplicate submissions
- provide accessible labels
- support keyboard navigation
- show appropriate pending states

Do not rely exclusively on native browser validation when the application has custom validation behavior.

Backend validation remains authoritative.

---

# 21. Responsive Design

Support responsive layouts.

At minimum consider:

- mobile
- tablet
- desktop

Do not introduce horizontal overflow.

Admin and candidate layouts must work across supported breakpoints.

---

# 22. Accessibility

New UI should maintain:

- visible focus states
- proper labels
- keyboard navigation
- accessible error messaging
- semantic HTML
- appropriate ARIA where needed
- sufficient color contrast

Existing shared design-token accessibility issues should be fixed at the design-system level rather than patched independently in individual pages.

---

# 23. Testing

Backend:

- pytest
- authorization tests
- ownership tests
- validation tests
- service behavior tests
- state transition tests

Frontend:

- Vitest
- React Testing Library
- component behavior tests
- route/security tests
- loading/error/empty states

Use browser/E2E testing for important user flows.

Critical flows include:

- authentication
- onboarding
- candidate dashboard
- resume workflow
- LinkedIn workflow
- mock interview workflow
- admin authorization
- admin review workflows
- admin credit workflows

---

# 24. Security Testing

Whenever a protected feature is added, test:

- unauthenticated access
- wrong-role access
- ownership violations
- manipulated IDs
- query-string bypasses
- malformed input
- invalid state transitions
- sensitive-field exposure

Security must be tested at the backend boundary.

---

# 25. Scope Discipline

Implement only the current phase.

Do NOT prematurely implement:

- AI Analyzer integration
- payments
- notifications
- events
- recruiter portal
- interviewer portal
- career coach portal
- job recommendations
- job matching
- placement tracking
- Redis
- Celery
- background workers
- S3/MinIO

unless explicitly included in the current phase.

Do not introduce infrastructure merely because it may be useful later.

---

# 26. Do Not Refactor Completed Phases Unnecessarily

Completed phases are considered stable.

When implementing a new phase:

1. inspect existing implementation
2. reuse existing services
3. make the smallest safe change
4. avoid unrelated refactoring
5. avoid changing working APIs without a requirement
6. preserve existing tests

If an architectural problem genuinely blocks the current phase, document it before changing it.

---

# 27. Documentation Files

The repository contains three important project-control documents:

### CLAUDE.md

Rules for Claude and development behavior.

### ARCHITECTURE.md

Technical source of truth describing the actual system architecture.

### PROJECT_STATUS.md

Current project state, completed phases, current phase, and upcoming work.

Do not duplicate the same information unnecessarily across these files.

When an architectural decision changes, update ARCHITECTURE.md.

When project progress changes, update PROJECT_STATUS.md.

When permanent development rules change, update CLAUDE.md.

---

# 28. Claude Context Efficiency

Claude sessions should be kept focused.

At the beginning of a new session:

1. Read CLAUDE.md
2. Read ARCHITECTURE.md when architecture is relevant
3. Read PROJECT_STATUS.md
4. Inspect the repository
5. Inspect the relevant existing implementation
6. Work only on the requested phase/task

Do not repeatedly restate the entire project history.

The repository and project documents are the source of truth.

If the current session becomes very large while continuing the same task, `/compact` may be used.

When a logical task is complete, prefer a fresh session for the next task/phase.

Do not keep one Claude session alive across multiple unrelated phases.

---

# 29. Required Development Workflow

For each phase:

1. Read project-control documents
2. Inspect current implementation
3. Identify reusable services/components
4. Plan the smallest safe implementation
5. Implement
6. Run focused tests
7. Run full relevant tests
8. Run lint/typecheck/build
9. Perform manual/browser verification when applicable
10. Review security
11. Review scope
12. Produce a concise implementation report
13. Stop

Do not automatically continue into the next phase.

---

# 30. Final Report Requirements

At the end of a task, report:

- what was implemented
- important files changed
- database/migration changes
- tests run
- lint/typecheck/build status
- manual verification
- security verification
- known limitations
- deferred items

Keep the report concise.

Do not repeat the entire architecture.

---

# 31. Git Rules

Do not commit unless explicitly asked.

Prefer one logical commit per completed phase.

Do not mix unrelated phase changes into one commit when they can be separated safely.

Before committing:

- inspect `git status`
- inspect changed files
- inspect the diff
- verify tests
- verify build/lint
- ensure no secrets are included

Tags may be created according to the project's phase convention when explicitly requested.

---

# 32. Golden Rule

Before changing anything:

> Inspect what already exists.

Before adding a dependency:

> Verify that the existing stack cannot solve the problem.

Before adding infrastructure:

> Verify that the current phase actually requires it.

Before changing architecture:

> Read ARCHITECTURE.md.

Before claiming completion:

> Run the tests and verify the implementation.