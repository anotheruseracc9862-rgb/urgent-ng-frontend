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
