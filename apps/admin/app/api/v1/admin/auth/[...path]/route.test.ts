import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/env", () => ({ env: { NEXT_PUBLIC_APP_URL: "http://localhost:4002", NEXT_PUBLIC_ADMIN_API_URL: "http://backend/api/v1/admin" } }));
import { GET, POST } from "./route";

afterEach(() => vi.unstubAllGlobals());
const context = (path: string) => ({ params: Promise.resolve({ path: path.split("/") }) });
const request = (origin = "http://localhost:4002") => new Request("http://localhost:4002/api/v1/admin/auth/refresh", {
  method: "POST", headers: { origin, cookie: "ung_at=consumer; ung_rt=consumer-refresh; ung_admin_at=admin; ung_admin_rt=refresh" }, body: "{}",
});

describe("admin auth proxy", () => {
  it("only forwards admin cookies, preserves Set-Cookie, removes tokens recursively", async () => {
    const headers = new Headers({ "x-request-id": "req-proxy" });
    headers.append("Set-Cookie", "ung_admin_at=new; Path=/; HttpOnly; SameSite=Strict");
    headers.append("Set-Cookie", "ung_admin_rt=rotated; Path=/api/v1/admin/auth; HttpOnly; SameSite=Strict");
    headers.append("Set-Cookie", "ung_at=consumer; Path=/");
    const fetcher = vi.fn().mockResolvedValue(Response.json({ data: { expiresIn: 900, accessToken: "secret", refreshToken: "secret", nested: { accessToken: "secret" } }, requestId: "req-proxy" }, { headers }));
    vi.stubGlobal("fetch", fetcher);
    const response = await POST(request(), context("refresh"));
    expect(fetcher.mock.calls[0][0]).toBe("http://backend/api/v1/admin/auth/refresh");
    expect(fetcher.mock.calls[0][1].headers.get("Cookie")).toBe("ung_admin_at=admin; ung_admin_rt=refresh");
    expect(await response.json()).toEqual({ data: { expiresIn: 900, nested: {} }, requestId: "req-proxy" });
    expect(response.headers.getSetCookie()).toHaveLength(2);
    expect(response.headers.get("x-request-id")).toBe("req-proxy");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it.each(["https://evil.invalid", "null", ""])("rejects cross-origin or missing Origin: %s", async (origin) => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect((await POST(request(origin), context("refresh"))).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("preserves failed-refresh cookie clearing and request ID", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: { code: "AUTH_REQUIRED", message: "Expired" }, requestId: "req-expired" }, { status: 401, headers: { "Set-Cookie": "ung_admin_rt=; Path=/api/v1/admin/auth; Max-Age=0" } })));
    const response = await POST(request(), context("refresh"));
    expect(response.status).toBe(401);
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
    expect(await response.json()).toMatchObject({ requestId: "req-expired" });
  });

  it("clears both local admin cookies even when upstream logout fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    const response = await POST(request(), context("logout"));
    expect(response.status).toBe(502);
    expect(response.headers.getSetCookie()).toEqual([
      "ung_admin_at=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict",
      "ung_admin_rt=; Path=/api/v1/admin/auth; Max-Age=0; HttpOnly; SameSite=Strict",
    ]);
  });

  it("does not act as an arbitrary backend proxy", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect((await GET(new Request("http://localhost:4002/api/v1/admin/auth/users"), context("users"))).status).toBe(404);
    expect((await POST(request(), context("../users"))).status).toBe(404);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
