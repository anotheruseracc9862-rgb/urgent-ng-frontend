# Urgent.ng Consumer Web

The requester and runner application runs on port `4001`.

From `frontend/`:

```bash
npm run dev --workspace=web
npm run build --workspace=web
npm run start --workspace=web
```

Copy this app's `.env.example` to `.env.local` before building or starting the
app. Browser API requests use the same-origin `/api/v1` proxy configured in
`next.config.ts`; the API origin defaults to `http://127.0.0.1:4000/api/v1`.
