# Ellow Launchpad — Web

Next.js (App Router, TypeScript) frontend for Ellow Launchpad.

See the [repository README](../../README.md) for setup and development instructions, its [Authentication architecture](../../README.md#authentication-architecture) section for the token/cookie design this app implements, [Resume Centre](../../README.md#resume-centre) for the resume upload/review design, and [LinkedIn Centre](../../README.md#linkedin-centre) for the URL/review design.

## Structure

- `app/` — routes and pages, including `login/`, `register/`, `onboarding/*`, the protected `app/` (dashboard), `app/profile/`, `app/resume/`, `app/linkedin/`, and the `api/` Route Handlers that proxy to FastAPI
- `components/` — reusable, generic UI components
- `features/` — feature-specific modules: `auth` (forms, logout), `onboarding` (the 5-step wizard), `dashboard` (header, completion/readiness/next-action cards, future-module placeholders), `profile` (inline add-experience form), `resume` (Resume Centre), `linkedin` (LinkedIn Centre)
- `lib/` — shared utilities, one subfolder per domain:
  - `lib/auth/` — server-only FastAPI client, cookie config, session helpers, browser-side auth API
  - `lib/candidate/` — server-only FastAPI client for profile/education/skills/experience/preferences/dashboard, the generic `/api/candidate/*` proxy (`proxy.ts`), browser-side client, shared types
  - `lib/resume/` — server-only FastAPI client, browser-side client, types for resumes/reviews (reuses the same generic candidate proxy — no separate Route Handler needed)
  - `lib/linkedin/` — server-only FastAPI client, browser-side client, types for the LinkedIn profile/review (also reuses the generic proxy)
- `proxy.ts` — Next's Proxy/Middleware convention; guards `/app/:path*` and `/onboarding/:path*`, silently refreshing the session before the page renders

## Pages

- `/register`, `/login` — auth forms
- `/onboarding`, `/onboarding/{about,education,skills,career,goal}` — guided profile setup; each step saves immediately on "Continue"
- `/app` — the candidate dashboard: greeting, profile completion, readiness breakdown, next action, resume/LinkedIn status, future-module placeholders
- `/app/profile` — full profile view/edit (reuses the onboarding step components for editing; has its own inline add-experience form since work experience has no onboarding step)
- `/app/resume` — Resume Centre: upload, version history, request review, view completed feedback
- `/app/linkedin` — LinkedIn Centre: add/edit URL, request review, view completed feedback

All of the above except `/register` and `/login` redirect to `/login` if there's no valid session.

## The generic candidate proxy

`app/api/candidate/[...path]/route.ts` + `lib/candidate/proxy.ts` forward every `/api/candidate/*` call to FastAPI's `/api/v1/candidate/*`, attaching the session's access token and silently refreshing once on a 401 — one implementation instead of writing a Route Handler per endpoint. It forwards bodies and response bytes as raw `ArrayBuffer`s with the original `Content-Type` preserved in both directions (not re-encoded as JSON/text), which is what lets the same proxy handle plain JSON candidate/profile calls, multipart resume uploads, and binary resume downloads without any special-casing. The route file exports `GET`/`POST`/`PUT`/`PATCH`/`DELETE` — LinkedIn's `PUT /linkedin` is what surfaced the need for `PUT` (caught during Phase 6's manual end-to-end verification, not by any automated test, since the backend tests call FastAPI directly and never exercise this proxy's method whitelist).

## Scripts

- `npm run dev` — start the development server
- `npm run build` — build for production
- `npm run start` — run the production build
- `npm run lint` — run ESLint
- `npm run test` — run Vitest tests
