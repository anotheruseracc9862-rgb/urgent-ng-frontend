// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { AdminView } from "@/lib/auth/shared";
import { Workspace } from "./workspace";
import { ReasonDialog } from "./actions";
import { resources } from "./catalog";
import { endpoints } from "./contracts";
import { SensitiveGate } from "./related";

const state = vi.hoisted(() => ({ params: new URLSearchParams(), push: vi.fn(), admin: null as AdminView | null }));
vi.mock("next/navigation", () => ({ useSearchParams: () => state.params, useRouter: () => ({ push: state.push }) }));
vi.mock("./shell", () => ({ useAdmin: () => state.admin }));
const server = setupServer();
let client: QueryClient;
const resource = (slug: string) => resources.find(r => r.slug === slug)!;
function mount(child: React.ReactNode) { return render(<QueryClientProvider client={client}>{child}</QueryClientProvider>); }
async function seriousViolations() {
  const result = await axe.run(document.body, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });
  return result.violations.filter(v => v.impact === "serious" || v.impact === "critical").map(v => `${v.id}: ${v.nodes.map(n => n.target).join(", ")}`);
}
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  // Node fetch has no browser origin; preserve real HTTP while resolving relative URLs.
  const fetch = globalThis.fetch;
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
    const options = { ...init }; delete options.signal; // jsdom AbortSignal is not Node's AbortSignal.
    return fetch(typeof input === "string" ? new URL(input, "http://admin.test").href : input, options);
  });
});
afterAll(() => { vi.unstubAllGlobals(); server.close(); });
beforeEach(() => {
  state.params = new URLSearchParams(); state.push.mockReset();
  state.admin = { id: "admin-1", email: "admin@test.invalid", displayName: "Reviewer", roles: [], permissions: [...new Set(endpoints.flatMap(e => e.permissions))] };
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  server.use(http.get("*/api/v1/admin/reason-codes", () => HttpResponse.json({ data: { codes: ["POLICY_VIOLATION", "OTHER"] } })));
});
afterEach(() => { cleanup(); client.clear(); server.resetHandlers(); });

describe("server-driven admin workspaces", () => {
  it.each(resources.filter(r => r.list))("$title renders the server's empty state", async r => {
    server.use(http.get(`*/api/v1/admin${r.list}`, () => HttpResponse.json({ data: [], meta: { hasNextPage: false } })));
    mount(<Workspace resource={r} />);
    expect(await screen.findByRole("heading", { name: "No records found" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(r.title);
  });

  it("keeps filters, cursors and columns in the URL rather than filtering a partial page", async () => {
    state.params = new URLSearchParams("q=Ada&limit=1&cursor=first&columns=name,status");
    server.use(http.get("*/api/v1/admin/users", ({ request }) => {
      const url = new URL(request.url);
      if (url.searchParams.get("q") !== "Ada" || url.searchParams.get("cursor") !== "first" || url.searchParams.get("limit") !== "1") return new HttpResponse(null, { status: 400 });
      return HttpResponse.json({ data: [{ id: "user-1", name: "Ada Review", status: "ACTIVE" }], meta: { hasNextPage: true, nextCursor: "second" } });
    }));
    mount(<Workspace resource={resource("users")} />);
    expect(await screen.findByText("Ada Review")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(state.push.mock.calls.at(-1)?.[0]).toContain("cursor=second");
    await userEvent.clear(screen.getByLabelText("Search"));
    await userEvent.type(screen.getByLabelText("Search"), "Bola");
    await userEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    const url = new URL(state.push.mock.calls.at(-1)![0], "http://admin.test");
    expect(url.searchParams.get("q")).toBe("Bola");
    expect(url.searchParams.has("cursor")).toBe(false);
    expect(url.searchParams.get("columns")).toBe("name,status");
  });

  it("denies a direct workspace URL without requesting its data", async () => {
    state.admin!.permissions = [];
    mount(<Workspace resource={resource("payments")} />);
    expect(screen.getByRole("heading", { name: "Access restricted" })).toBeTruthy();
    expect(client.getQueryCache().getAll().every(q => q.state.fetchStatus === "idle")).toBe(true);
  });

  it("keeps a maximum-size page accessible and uses keyboard tabs without revealing sensitive data", async () => {
    state.params = new URLSearchParams("limit=100&record=user-100");
    const rows = Array.from({ length: 100 }, (_, i) => ({ id: `user-${i + 1}`, name: `Reviewer ${i + 1}`, status: "ACTIVE" }));
    server.use(
      http.get("*/api/v1/admin/users", () => HttpResponse.json({ data: rows, meta: { hasNextPage: true, nextCursor: "next" } })),
      http.get("*/api/v1/admin/users/user-100", () => HttpResponse.json({ data: rows[99] })),
    );
    mount(<Workspace resource={resource("users")} />);
    await screen.findByRole("button", { name: "Deactivate" });
    const details = screen.getByRole("tab", { name: "Details" });
    details.focus();
    await userEvent.keyboard("{ArrowRight}");
    const contact = screen.getByRole("tab", { name: "Contact" });
    await waitFor(() => expect(contact.getAttribute("aria-selected")).toBe("true"));
    expect(document.activeElement).toBe(contact);
    expect(screen.getByRole("button", { name: "Reveal with a reason" })).toBeTruthy();
    expect(client.getQueryCache().getAll().some(q => q.queryKey.includes("/users/{id}/contact"))).toBe(false);
    expect(await seriousViolations()).toEqual([]);
    await userEvent.keyboard("{Home}");
    await waitFor(() => expect(details.getAttribute("aria-selected")).toBe("true"));
    expect(document.activeElement).toBe(details);
  });

  it("shows server failures with their request IDs and a retry", async () => {
    server.use(http.get("*/api/v1/admin/users", () => HttpResponse.json({ error: { code: "UNAVAILABLE", message: "Try later" }, requestId: "req-users-503" }, { status: 503 })));
    mount(<Workspace resource={resource("users")} />);
    expect((await screen.findByRole("alert")).textContent).toContain("req-users-503");
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });
});

describe("audited actions and sensitive reads", () => {
  it("requires OTHER text, preserves the selected target, and shows pending instead of applied", async () => {
    const result = vi.fn();
    server.use(http.post("*/api/v1/admin/users/user-1/deactivate", async ({ request }) => {
      expect(await request.json()).toEqual({ reasonCode: "OTHER", reasonText: "Account review" });
      return HttpResponse.json({ data: { approvalRequired: true, approval: { id: "approval-1" } }, requestId: "req-action" });
    }));
    mount(<ReasonDialog action={resource("users").actions![0]} id="user-1" onClose={() => {}} onResult={result} />);
    await waitFor(() => expect((screen.getByRole("button", { name: "Confirm action" }) as HTMLButtonElement).disabled).toBe(false));
    expect(await seriousViolations()).toEqual([]);
    expect(screen.queryByLabelText(/target ID/i)).toBeNull();
    await userEvent.selectOptions(screen.getByLabelText(/Reason Code/), "OTHER");
    await userEvent.click(screen.getByRole("button", { name: "Confirm action" }));
    expect(result).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText(/Reason Text/), "Account review");
    await userEvent.click(screen.getByRole("button", { name: "Confirm action" }));
    await waitFor(() => expect(result).toHaveBeenCalledWith(expect.objectContaining({ data: { approvalRequired: true, approval: { id: "approval-1" } } })));
  });

  it("does not load or query-cache contact until explicitly confirmed, then discards it", async () => {
    let reads = 0;
    server.use(http.get("*/api/v1/admin/users/user-1/contact", () => { reads++; return HttpResponse.json({ data: { phone: "+2348012345678" } }); }));
    mount(<SensitiveGate path="/users/{id}/contact" id="user-1" />);
    expect(reads).toBe(0);
    await userEvent.click(screen.getByRole("button", { name: "Reveal with a reason" }));
    await screen.findByRole("option", { name: "POLICY VIOLATION" });
    expect(reads).toBe(0);
    await userEvent.selectOptions(screen.getByLabelText(/Reason Code/), "POLICY_VIOLATION");
    await userEvent.click(screen.getByRole("button", { name: "Reveal information" }));
    expect(await screen.findByText("+2348012345678")).toBeTruthy();
    expect(reads).toBe(1);
    expect(JSON.stringify(client.getQueryData(["admin", "reason-codes"]))).not.toContain("2348012345678");
    expect(client.getQueryCache().getAll().map(q => q.queryKey)).toEqual([["admin", "reason-codes"]]);
    await userEvent.click(screen.getByRole("button", { name: "Hide sensitive data" }));
    expect(screen.queryByText("+2348012345678")).toBeNull();
  });

  it("does not offer self-approval of a large refund", async () => {
    state.params = new URLSearchParams("record=refund-1");
    server.use(http.get("*/api/v1/admin/refunds", () => HttpResponse.json({ data: [{ id: "refund-1", data: { status: "REQUESTED", amountMinor: 5000000, requestedById: "admin-1" } }] })));
    mount(<Workspace resource={resource("refunds")} />);
    expect(await screen.findByText(/requester cannot approve/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
    expect(screen.getByRole("button", { name: "Reject" })).toBeTruthy();
  });

  it("requires server canDecide for four-eyes decisions but lets the requester withdraw", async () => {
    state.params = new URLSearchParams("record=approval-1");
    server.use(
      http.get("*/api/v1/admin/approvals", () => HttpResponse.json({ data: [] })),
      http.get("*/api/v1/admin/approvals/approval-1", () => HttpResponse.json({ data: { id: "approval-1", status: "PENDING", requestedBy: "admin-1", canDecide: false, expiresAt: new Date(Date.now() + 60_000).toISOString() } })),
    );
    mount(<Workspace resource={resource("approvals")} />);
    expect(await screen.findByRole("button", { name: "Cancel" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reject" })).toBeNull();
  });
});
