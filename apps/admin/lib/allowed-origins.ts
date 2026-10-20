import { env } from "./env";

// Dev only: a port-forwarding tunnel rewrites Origin to the local address, and the console is also opened locally.
const DEV_ORIGINS = ["http://localhost:4002", "http://127.0.0.1:4002"];

export function isAllowedWriteOrigin(origin: string | null): boolean {
  const allowed = [new URL(env.NEXT_PUBLIC_APP_URL).origin];
  if (process.env.NODE_ENV !== "production") allowed.push(...DEV_ORIGINS);
  return origin !== null && allowed.includes(origin);
}
