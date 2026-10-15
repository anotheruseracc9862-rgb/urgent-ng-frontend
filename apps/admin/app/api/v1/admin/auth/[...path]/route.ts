import { env } from "@/lib/env";

const writes = new Set(["login", "mfa/enrol", "mfa/verify", "refresh", "logout", "accept-invite"]);
function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "accessToken" && key !== "refreshToken").map(([key, item]) => [key, sanitize(item)]));
}

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const path = (await context.params).path.join("/");
  const allowed = request.method === "GET" ? path === "me" : writes.has(path);
  if (!allowed) return Response.json({ error: { code: "NOT_FOUND", message: "Unknown admin auth endpoint." } }, { status: 404 });
  if (request.method !== "GET" && (request.headers.get("origin") !== new URL(env.NEXT_PUBLIC_APP_URL).origin || request.headers.get("sec-fetch-site") === "cross-site")) {
    return Response.json({ error: { code: "FORBIDDEN", message: "Cross-origin authentication requests are not allowed." } }, { status: 403 });
  }
  const headers = new Headers({ Accept: "application/json", "Content-Type": "application/json" });
  const cookie = (request.headers.get("cookie") ?? "").split(";").map((v) => v.trim()).filter((v) => /^ung_admin_(at|rt)=/.test(v)).join("; ");
  if (cookie) headers.set("Cookie", cookie);
  try {
    const upstream = await fetch(`${env.NEXT_PUBLIC_ADMIN_API_URL.replace(/\/$/, "")}/auth/${path}`, {
      method: request.method, headers, body: request.method === "GET" ? undefined : await request.text(),
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000),
    });
    const responseHeaders = new Headers({ "Cache-Control": "no-store" });
    for (const name of ["x-request-id", "retry-after"]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    for (const value of upstream.headers.getSetCookie()) {
      if (/^ung_admin_(at|rt)=/.test(value)) responseHeaders.append("Set-Cookie", value);
    }
    if (path === "logout") clearCookies(responseHeaders);
    if (upstream.status === 204) return new Response(null, { status: 204, headers: responseHeaders });
    const payload = sanitize(await upstream.json());
    return Response.json(payload, { status: upstream.status, headers: responseHeaders });
  } catch {
    const headers = new Headers({ "Cache-Control": "no-store" });
    if (path === "logout") clearCookies(headers);
    return Response.json({ error: { code: "UPSTREAM_UNAVAILABLE", message: "Authentication service unavailable. Try again." } }, { status: 502, headers });
  }
}

function clearCookies(headers: Headers) {
  for (const [name, path] of [["ung_admin_at", "/"], ["ung_admin_rt", "/api/v1/admin/auth"]]) {
    headers.append("Set-Cookie", `${name}=; Path=${path}; Max-Age=0; HttpOnly; SameSite=Strict`);
  }
}

export const GET = proxy;
export const POST = proxy;
