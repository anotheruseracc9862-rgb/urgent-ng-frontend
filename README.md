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

## Conventions

- Server Components by default; Client Components only where interaction requires
- TanStack Query for server state (features own their query keys)
- react-hook-form + Zod + @hookform/resolvers for forms
- The backend is the authority — frontend never enforces business rules
