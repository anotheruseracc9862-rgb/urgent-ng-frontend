import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("./lib/env", () => ({ env: { NEXT_PUBLIC_APP_URL: "https://admin.urgent.test", NEXT_PUBLIC_ADMIN_MEDIA_ORIGIN: "https://evidence.urgent.test" } }));
import { proxy } from "./proxy";

afterEach(() => vi.unstubAllEnvs());

describe("admin browser security boundary", () => {
  it("issues a fresh production nonce, overrides hostile request headers, and forbids broad script/connect sources", () => {
    vi.stubEnv("NODE_ENV", "production");
    const request = new NextRequest("https://admin.urgent.test/login", { headers: { "x-nonce": "attacker", "Content-Security-Policy": "script-src *" } });
    const first = proxy(request), second = proxy(request);
    const policy = first.headers.get("Content-Security-Policy")!;
    const script = policy.split(";").map(d => d.trim()).find(d => d.startsWith("script-src"))!;
    expect(script).toMatch(/'nonce-[A-Za-z0-9+/]{24}'/);
    expect(script).toContain("'strict-dynamic'");
    expect(script).not.toMatch(/unsafe-inline|unsafe-eval|attacker/);
    expect(first.headers.get("x-middleware-request-content-security-policy")).toBe(policy);
    expect(second.headers.get("Content-Security-Policy")).not.toBe(policy);
    expect(policy).toContain("connect-src 'self' https://evidence.urgent.test;");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(first.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])("rejects cross-origin and missing-origin %s requests before backend forwarding", method => {
    const rejected: Record<string, string>[] = [{ origin: "https://evil.test" }, {}, { origin: "https://admin.urgent.test", "sec-fetch-site": "cross-site" }];
    for (const headers of rejected) {
      const response = proxy(new NextRequest("https://admin.urgent.test/api/v1/admin/users/id/deactivate", { method, headers }));
      expect(response.status).toBe(403);
      expect(response.headers.get("x-middleware-next")).toBeNull();
    }
    const allowed = proxy(new NextRequest("https://admin.urgent.test/api/v1/admin/users/id/deactivate", { method, headers: { origin: "https://admin.urgent.test" } }));
    expect(allowed.headers.get("x-middleware-next")).toBe("1");
    expect(allowed.headers.get("Cache-Control")).toBe("no-store");
  });

  it("does not block read requests without Origin or add production eval allowances", () => {
    expect(proxy(new NextRequest("https://admin.urgent.test/api/v1/admin/users")).headers.get("x-middleware-next")).toBe("1");
    vi.stubEnv("NODE_ENV", "development");
    const policy = proxy(new NextRequest("https://admin.urgent.test/login")).headers.get("Content-Security-Policy")!;
    expect(policy).toContain("'unsafe-eval'");
    expect(policy.split(";").find(d => d.trim().startsWith("script-src"))).not.toContain("'unsafe-inline'");
  });
});
