# Urgent.ng Frontend

Turborepo + pnpm monorepo for Urgent.ng's web applications. See
`../doc/Urgent.ng — Frontend Architecture PRD.md` for the authoritative
specification.

## Structure

```text
frontend/
├── apps/
│   ├── web/    # Consumer application (requester + runner), port 3001
│   └── admin/  # Internal administration application, port 3002
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
pnpm install
pnpm dev          # web on :3001, admin on :3002
pnpm build        # production build of all apps and packages
pnpm typecheck
```

Copy `.env.example` to `.env.local` in each app for environment configuration.

## Conventions

- Server Components by default; Client Components only where interaction requires
- TanStack Query for server state (features own their query keys)
- react-hook-form + Zod + @hookform/resolvers for forms
- The backend is the authority — frontend never enforces business rules
