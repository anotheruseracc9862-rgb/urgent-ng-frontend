# Urgent.ng Frontend

Turborepo + npm workspaces for Urgent.ng's web applications. See
`../doc/Urgent.ng — Frontend Architecture PRD.md` for the authoritative
specification.

## Structure

```text
frontend/
├── apps/
│   ├── web/    # Consumer application (requester + runner), port 4001
│   └── admin/  # Internal administration application, port 4002
└── packages/
    ├── ui/            # Reusable UI primitives (Radix + CVA + tailwind-merge)
    ├── api-client/    # Shared HTTP client infrastructure
    ├── schemas/       # Genuinely shared Zod schemas
    ├── types/         # Shared TypeScript domain types
    ├── utils/         # Shared utility functions
    ├── config/        # Env var helpers (NEXT_PUBLIC_API_URL etc.)
    └── eslint-config/ # Shared ESLint config
```

Consumer and admin applications are separate applications with separate auth
contexts — never one app with an `/admin` route.

## Getting started

```bash
npm ci
npm run dev       # web on :4001, admin on :4002
npm run build     # production build of all apps and packages
npm run typecheck
npm run check     # lint, typecheck and tests
```

Copy `apps/web/.env.example` to `apps/web/.env.local` and
`apps/admin/.env.example` to `apps/admin/.env.local`. Both apps proxy API
requests through their own origin; the API runs on port 4000 by default.
Use Node.js 20.9 or newer.

## Environment

`apps/web/.env.example` lists every variable. Required: `NEXT_PUBLIC_API_URL` (backend origin
with `/api/v1`) and `NEXT_PUBLIC_APP_URL` (the web origin, `http://localhost:4001` locally).
Optional until the feature is used: Google Maps key, Google OAuth client id, and the Firebase web
push settings (`NEXT_PUBLIC_FIREBASE_*`, VAPID key). The app refuses to boot when a required
variable is missing or malformed.

For payments, set the backend `PAYSTACK_CALLBACK_URL` to `<web origin>/checkout/return`
(`http://localhost:4001/checkout/return` locally). Webhooks reach the backend, so tunnel port
4000 (for example `cloudflared tunnel --url http://localhost:4000`) and register
`https://<tunnel>/api/v1/webhooks/paystack` in the Paystack dashboard.

## Quality gates

| Command | What it checks |
|---|---|
| `npm run check` | lint, typecheck, unit and component tests (includes the axe accessibility suite, contrast of design tokens, the sensitive-data scan and the security-header tests) |
| `npm run contract:check` | generated client equals `backend/openapi.json`; every literal API call exists in the contract |
| `npm run audit:prod` | `npm audit --omit=dev` is clean |
| `npm run build -w web && npm run budgets` | first-load JavaScript budget per route (`scripts/budgets.json`) |
| `npm run start -w web -- -p 4001` then `npm run responsive` | no horizontal overflow at 360, 768 and 1280 px and no Content-Security-Policy violation on public routes (needs Chrome; set `CHROME_PATH` if it is not found) |

When the backend contract changes: `npm run generate -w @urgent/api-client`, fix compile errors,
then `npm run contract:check`.

## Release checklist

1. `npm ci`, then every gate above is green.
2. Backend `npm run contract:check` is green and `backend/openapi.json` is the version released.
3. Production env set; `NEXT_PUBLIC_API_URL` points at the production API (the CSP `connect-src`
   is built from it).
4. `npm run build -w web`, then `npm run start -w web`.
5. Smoke: sign in, post an errand, open `/pricing`, `/pro`, `/settings/orders`.
6. Live-provider checks still to run by hand: a Paystack purchase and webhook settlement, a real
   Google sign-in, a Firebase push with the tab closed, a live SSE session.

## Conventions

- Server Components by default; Client Components only where interaction requires
- TanStack Query for server state (features own their query keys)
- react-hook-form + Zod + @hookform/resolvers for forms
- The backend is the authority — frontend never enforces business rules
