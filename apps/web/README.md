# Ellow Launchpad — Web

Next.js (App Router, TypeScript) frontend for Ellow Launchpad.

See the [repository README](../../README.md) for setup and development instructions, and its [Authentication architecture](../../README.md#authentication-architecture) section for the token/cookie design this app implements.

## Structure

- `app/` — routes and pages, including `login/`, `register/`, the protected `app/` (current-user) page, and the `api/` Route Handlers that proxy to FastAPI
- `components/` — reusable, generic UI components
- `features/` — feature-specific modules (`features/health`, `features/auth`: forms and the logout button)
- `lib/` — shared utilities: `lib/api.ts`/`lib/config.ts` (health check), `lib/auth/` (server-only FastAPI client, cookie config, session helpers, browser-side auth API)
- `proxy.ts` — Next's Proxy/Middleware convention; guards `/app/:path*` and silently refreshes the session before the page renders

## Pages

- `/register` — email, password, confirm password
- `/login` — email, password
- `/app` — protected; redirects to `/login` if there's no valid session, otherwise shows the authenticated user's email and roles

## Scripts

- `npm run dev` — start the development server
- `npm run build` — build for production
- `npm run start` — run the production build
- `npm run lint` — run ESLint
- `npm run test` — run Vitest tests
