import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@urgent/api-client";
import { adminApi, adminErrorMessage, adminRequest } from "./client";

const success = (data: unknown, meta?: unknown) => Response.json({ data, meta, requestId: "req-1" });
const denied = () => Response.json({ error: { code: "AUTH_REQUIRED", message: "Sign in again" }, requestId: "req-denied" }, { status: 401 });
afterEach(() => { vi.unstubAllGlobals(); });

describe("admin client", () => {
  it("uses the admin prefix and retains the envelope metadata", async () => {
    const fetcher = vi.fn().mockResolvedValue(success([1], { nextCursor: "next" }));
    vi.stubGlobal("fetch", fetcher);
    const result = await adminRequest("/users", { query: { limit: 10 }, baseUrl: "https://untrusted.invalid" });
    expect(fetcher.mock.calls[0][0]).toBe("/api/v1/admin/users?limit=10");
    expect(result).toMatchObject({ data: [1], meta: { nextCursor: "next" }, requestId: "req-1" });
  });

  it("single-flights refresh for simultaneous explicit 401 responses", async () => {
    let refreshed = false;
    const fetcher = vi.fn(async (url: string) => {
      if (url.endsWith("/auth/refresh")) {
        await new Promise((resolve) => setTimeout(resolve, 5));
        refreshed = true; return success({ expiresIn: 900 });
      }
      return refreshed ? success({ id: "admin" }) : denied();
    });
    vi.stubGlobal("fetch", fetcher);
    await expect(Promise.all([adminApi("/users"), adminApi("/auth/me")])).resolves.toEqual([{ id: "admin" }, { id: "admin" }]);
    expect(fetcher.mock.calls.filter(([url]) => url.endsWith("/auth/refresh"))).toHaveLength(1);
  });

  it.each(["network", "server"])("does not replay a mutation after %s failure", async (mode) => {
    const fetcher = vi.fn().mockImplementation(() => mode === "network" ? Promise.reject(new Error("offline")) : Promise.resolve(Response.json({}, { status: 503 })));
    vi.stubGlobal("fetch", fetcher);
    await expect(adminApi("/users/id/suspend", { method: "POST", body: { reason: "test" } })).rejects.toBeInstanceOf(ApiError);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("replays a mutation only after an explicit 401 and successful refresh", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(denied()).mockResolvedValueOnce(success({ expiresIn: 900 })).mockResolvedValueOnce(success({ ok: true }));
    vi.stubGlobal("fetch", fetcher);
    await expect(adminApi("/users/id/suspend", { method: "POST", body: { reason: "test" }, idempotencyKey: "key" })).resolves.toEqual({ ok: true });
    expect(fetcher.mock.calls[2][1].headers.get("Idempotency-Key")).toBe("key");
  });

  it("clears client session via the expiry event and redirects after failed refresh", async () => {
    const dispatchEvent = vi.fn(); const replace = vi.fn();
    vi.stubGlobal("window", { dispatchEvent, location: { pathname: "/dashboard", replace } });
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => denied()));
    await expect(adminApi("/users")).rejects.toMatchObject({ requestId: "req-denied" });
    expect(dispatchEvent.mock.calls[0][0].type).toBe("urgent-admin:expired");
    expect(replace).toHaveBeenCalledWith("/login?expired=1&requestId=req-denied");
  });

  it("does not refresh failed login or noRefresh calls", async () => {
    const fetcher = vi.fn().mockImplementation(async () => denied()); vi.stubGlobal("fetch", fetcher);
    await expect(adminApi("/auth/login", { method: "POST" })).rejects.toBeInstanceOf(ApiError);
    await expect(adminApi("/users", { noRefresh: true })).rejects.toBeInstanceOf(ApiError);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("hides request IDs from error messages", () => {
    expect(adminErrorMessage(new ApiError(403, "FORBIDDEN", "Not permitted", undefined, "request-42"))).not.toContain("request-42");
  });

  it.each(["https://evil.invalid", "//evil.invalid", "/../auth", "/%2e%2e/auth", "/foo\\bar"])("rejects escaping path %s", async (path) => {
    await expect(adminApi(path)).rejects.toBeInstanceOf(TypeError);
  });
});
