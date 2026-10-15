import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { cookieGet } = vi.hoisted(() => ({ cookieGet: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: cookieGet }) }));
vi.mock("../env", () => ({ env: { NEXT_PUBLIC_ADMIN_API_URL: "http://backend/api/v1/admin" } }));
import { getAdminSession } from "./server";

afterEach(() => { vi.unstubAllGlobals(); cookieGet.mockReset(); });
describe("getAdminSession", () => {
  it("does not accept consumer cookies as an admin session", async () => {
    cookieGet.mockImplementation((name) => name === "ung_at" ? { value: "consumer" } : undefined);
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect(await getAdminSession()).toBeNull();
    expect(cookieGet).toHaveBeenCalledWith("ung_admin_at");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("validates with /me and forwards only the access cookie", async () => {
    cookieGet.mockReturnValue({ value: "admin-access" });
    const admin = { id: "id", email: "admin@example.com", displayName: "Admin", roles: [], permissions: [] };
    const fetcher = vi.fn().mockResolvedValue(Response.json({ data: admin })); vi.stubGlobal("fetch", fetcher);
    expect(await getAdminSession()).toEqual(admin);
    expect(fetcher.mock.calls[0][0]).toBe("http://backend/api/v1/admin/auth/me");
    expect(fetcher.mock.calls[0][1].headers.get("Cookie")).toBe("ung_admin_at=admin-access");
  });
  it("returns null on expired access but does not hide backend outages", async () => {
    cookieGet.mockReturnValue({ value: "expired" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({}, { status: 401 })).mockResolvedValueOnce(Response.json({}, { status: 503 })));
    expect(await getAdminSession()).toBeNull();
    await expect(getAdminSession()).rejects.toMatchObject({ status: 503 });
  });
});
