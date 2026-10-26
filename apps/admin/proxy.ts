import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "./lib/env";
import { isAllowedWriteOrigin } from "./lib/allowed-origins";
import { contentSecurityPolicy } from "./lib/security-headers";

export function proxy(request: NextRequest) {
  const api = request.nextUrl.pathname.startsWith("/api/");
  if (api && !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
    (!isAllowedWriteOrigin(request.headers.get("origin")) || request.headers.get("sec-fetch-site") === "cross-site")) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Cross-origin admin writes are not allowed." } }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  if (api) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
  const nonce = randomBytes(18).toString("base64");
  const policy = contentSecurityPolicy(nonce, process.env.NODE_ENV === "production", env.NEXT_PUBLIC_ADMIN_MEDIA_ORIGIN);
  const headers = new Headers(request.headers);
  // Overwrite caller-supplied values; Next reads this CSP to nonce its bootstrap scripts.
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
