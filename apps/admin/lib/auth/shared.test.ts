import { describe, expect, it } from "vitest";
import { DEFAULT_IDLE_SECONDS, safeAdminReturnTo } from "./shared";

describe("admin auth shared", () => {
  it("uses a conservative 15 minute idle fallback", () => { expect(DEFAULT_IDLE_SECONDS).toBe(900); });
  it.each([null, "https://evil.invalid", "//evil.invalid", "/\\evil.invalid", "/login", "/session?returnTo=/session", "/session/", "/users/../session", "/%2f%2fevil.invalid", "/api/v1/admin/auth/refresh"])("rejects unsafe return target %s", (value) => {
    expect(safeAdminReturnTo(value)).toBe("/dashboard");
  });
  it("preserves a local console return target", () => { expect(safeAdminReturnTo("/users?page=2")).toBe("/users?page=2"); });
});
