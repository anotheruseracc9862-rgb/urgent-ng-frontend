# Urgent.ng Admin

The separate administrator application runs on port `4002`.

From `frontend/`:

```bash
npm run dev --workspace=admin
npm run build --workspace=admin
npm run start --workspace=admin
```

Copy this app's `.env.example` to `.env.local` before building or starting the
app. Admin authentication and session state are isolated from the consumer app.

`NEXT_PUBLIC_ADMIN_API_URL` must include `/api/v1/admin` (default backend port
4000). `NEXT_PUBLIC_APP_URL` must be this app's exact origin; authentication writes
from another origin are refused. The browser calls the same-origin admin proxy;
access and refresh tokens stay in HttpOnly admin cookies, not browser storage.
Do not use a consumer account: an existing administrator must invite you, then
you accept the invitation, set a password, and enrol an authenticator at login.

## Console and contracts

Navigation and direct-route access use the permissions returned by `/auth/me`.
Workspaces cover trust, marketplace, cases, billing, configuration, operations,
audit/analytics, and administrator access. Filters, cursor and selected columns
are held in the URL. Sensitive tabs load only after explicit confirmation, keep
data out of the query cache, and discard it when the tab closes. Most backend
sensitive GETs audit access but do not accept a reason; the UI does not invent
unsupported request fields. Four-eyes requests remain pending until the backend
executes them; the requester cannot approve their own request.

The console's generated contract includes the backend's OpenAPI schemas,
class-validator constraints and actual `AdminAuth` permissions. With the sibling
`backend/` checkout present, run from `frontend/`:

```bash
node apps/admin/scripts/generate-admin-contracts.mjs
node apps/admin/scripts/generate-admin-contracts.mjs --check
npm run check -- --filter=admin
npm run build --workspace=admin
```

The contract test checks generation and complete non-auth endpoint coverage.
Component tests use MSW; they do not contact a development or production database.
Never run destructive backend test setup against a shared database.

## Before release

F9 is implemented locally, not a production-readiness certification. Complete
manual keyboard/screen-reader and real-device checks, admin CSP/security review,
deployed performance/budget measurements and long-table performance evaluation.
Verify real storage/media CORS and signed-link expiry, payment/refund provider
behaviour, and notification delivery in a controlled sandbox. The local real-stack
browser checks used an isolated database, Redis DB 14 and fake external providers.
