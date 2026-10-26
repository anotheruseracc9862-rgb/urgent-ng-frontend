// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
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
import { Workbench } from "./workbench";
import { resourceLocation, visibleTabs, workspaces } from "./navigation";

const state = vi.hoisted(() => ({ params: new URLSearchParams(), push: vi.fn(), admin: null as AdminView | null }));
vi.mock("next/navigation", () => ({ useSearchParams: () => state.params, usePathname: () => '/billing', useRouter: () => ({ push: state.push }) }));
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
  it("gives every existing resource exactly one home without exposing searches or reasons in links", () => {
    const sources = workspaces.flatMap(w => w.tabs.flatMap(t => t.sources));
    expect([...sources].sort()).toEqual(resources.map(r => r.slug).sort());
    const url = new URL(resourceLocation('users', { q: 'private phone', reasonText: 'private case', status: 'ACTIVE', cursor: 'next', tab: 'wrong', view: 'payments' }), 'http://admin.test');
    expect(Object.fromEntries(url.searchParams)).toEqual({ status: 'ACTIVE', cursor: 'next', tab: 'accounts', view: 'users' });
  });

  it("defaults to an authorized source and resets filters when switching sources", async () => {
    state.admin!.permissions = ['VERIFICATION_VIEW'];
    state.params = new URLSearchParams('tab=accounts&view=users&cursor=old&status=ACTIVE');
    server.use(http.get('*/api/v1/admin/verifications', ({ request }) => {
      expect(new URL(request.url).search).toBe('');
      return HttpResponse.json({ data: [], meta: { hasNextPage: false } });
    }));
    mount(<Workbench workspace={workspaces.find(w => w.slug === 'users')!} />);
    expect(await screen.findByRole('heading', { name: 'No records found' })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'Accounts' })).toBeNull();
    cleanup();
    state.params = new URLSearchParams('tab=transactions&view=orders&cursor=old&status=PAID');
    state.admin!.permissions = [...new Set(endpoints.flatMap(e => e.permissions))];
    server.use(http.get('*/api/v1/admin/orders', () => HttpResponse.json({ data: [] })));
    mount(<Workbench workspace={workspaces.find(w => w.slug === 'billing')!} />);
    await userEvent.selectOptions(screen.getByLabelText('Transactions view'), 'payments');
    expect(state.push.mock.calls.at(-1)?.[0]).toBe('/billing?tab=transactions&view=payments');
  });

  it("offers a restart when a saved cursor is rejected", async () => {
    state.params = new URLSearchParams('cursor=old');
    server.use(http.get('*/api/v1/admin/disputes', () => HttpResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid deadline pagination cursor.' } }, { status: 400 })));
    mount(<Workspace resource={resource('disputes')} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Back to first page' }));
    expect(state.push.mock.calls.at(-1)?.[0]).not.toContain('cursor=');
  });

  it("offers bounded time-window presets for reports", async () => {
    server.use(http.get('*/api/v1/admin/analytics/overview', () => HttpResponse.json({ data: {} })));
    mount(<Workspace resource={resource('analytics-overview')} />);
    const select = await screen.findByLabelText('Time window');
    expect([...select.querySelectorAll('option')].map(o => o.value)).toEqual(['7', '30', '90', '365']);
  });

  it("shows current, proposed and approval consequences when scheduling a price", async () => {
    const price = resource("pricing").actions![0];
    const record = { id: "p1", code: "PRO", currentPriceKobo: 500000, upcoming: [] };
    mount(<ReasonDialog action={price} id="p1" record={record} onClose={() => {}} onResult={() => {}} />);
    expect(screen.getByText("₦5,000.00")).toBeTruthy();
    await userEvent.type(screen.getByLabelText(/Amount Kobo/i), "600000");
    expect(await screen.findByText(/₦6,000.00 \(\+₦1,000.00\)/)).toBeTruthy();
    expect(screen.getByText(/does not change until a different administrator approves/)).toBeTruthy();
  });

  it("previews a template as plain text and rejects unknown placeholders before submit", async () => {
    const template = resource("templates").actions![0];
    const record = { key: "k", title: "Hi {name}", body: "<b>Offer</b> {amount}", placeholders: ["name", "amount"], active: true };
    mount(<ReasonDialog action={template} id="k" record={record} onClose={() => {}} onResult={() => {}} />);
    const preview = screen.getByLabelText("Notification preview");
    expect(within(preview).getByText("name").tagName).toBe("MARK");
    expect(preview.textContent).toContain("<b>Offer</b>");
    expect(preview.querySelectorAll("b").length).toBe(1);
    await userEvent.type(screen.getByLabelText(/^Body/), " {{secret}");
    expect(await screen.findByText(/Unknown placeholder: \{secret\}/)).toBeTruthy();
  });

  it("lets a billing-only operator reach Billing but not Users", () => {
    state.admin!.permissions = ["BILLING_VIEW"];
    expect(visibleTabs(workspaces.find(w => w.slug === "billing")!, state.admin!).map(t => t.title)).toEqual(["Transactions", "Refunds", "Subscriptions", "Boosts"]);
    expect(visibleTabs(workspaces.find(w => w.slug === "users")!, state.admin!)).toEqual([]);
  });

  it("keeps approvals reachable for an admin with no domain permissions", () => {
    state.admin!.permissions = [];
    const visible = workspaces.filter(w => visibleTabs(w, state.admin!).length).map(w => w.slug);
    expect(visible).toEqual(["administration"]);
    expect(visibleTabs(workspaces.find(w => w.slug === "administration")!, state.admin!).map(t => t.title)).toEqual(["Approvals"]);
  });

  it("sends an embedded search to the server but excludes it from navigation history", async () => {
    let search = '';
    server.use(http.get('*/api/v1/admin/users', ({ request }) => { search = new URL(request.url).searchParams.get('q') ?? ''; return HttpResponse.json({ data: [] }); }));
    mount(<Workspace resource={resource('users')} />);
    await screen.findByRole('heading', { name: 'No records found' });
    await userEvent.type(screen.getByLabelText('Search'), 'private phone');
    await userEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    await waitFor(() => expect(search).toBe('private phone'));
    expect(state.push.mock.calls.at(-1)?.[0]).not.toContain('private');
    expect(state.push.mock.calls.at(-1)?.[0]).not.toContain('q=');
  });

  it.each(resources.filter(r => r.list))("$title renders the server's empty state", async r => {
    server.use(http.get(`*/api/v1/admin${r.list}`, () => HttpResponse.json({ data: [], meta: { hasNextPage: false } })));
    mount(<Workspace resource={r} />);
    expect(await screen.findByRole("heading", { name: "No records found" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: r.title.replace("Analytics: ", "") })).toBeTruthy();
  });

  it("keeps filters, cursors and columns in the URL rather than filtering a partial page", async () => {
    state.params = new URLSearchParams("limit=1&cursor=first&columns=name,status");
    server.use(http.get("*/api/v1/admin/users", ({ request }) => {
      const url = new URL(request.url);
      if (url.searchParams.get("cursor") !== "first" || url.searchParams.get("limit") !== "1") return new HttpResponse(null, { status: 400 });
      return HttpResponse.json({ data: [{ id: "user-1", name: "Ada Review", status: "ACTIVE" }], meta: { hasNextPage: true, nextCursor: "second" } });
    }));
    mount(<Workspace resource={resource("users")} />);
    expect(await screen.findByText("Ada Review")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(state.push.mock.calls.at(-1)?.[0]).toContain("cursor=second");
    await userEvent.type(screen.getByLabelText("Search"), "Bola");
    await userEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    const url = new URL(state.push.mock.calls.at(-1)![0], "http://admin.test");
    expect(url.searchParams.has("q")).toBe(false); // searches stay out of browser history
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
    expect(screen.getByRole("button", { name: "Reveal information" })).toBeTruthy();
    expect(client.getQueryCache().getAll().some(q => q.queryKey.includes("/users/{id}/contact"))).toBe(false);
    expect(await seriousViolations()).toEqual([]);
    await userEvent.keyboard("{Home}");
    await waitFor(() => expect(details.getAttribute("aria-selected")).toBe("true"));
    expect(document.activeElement).toBe(details);
  });

  it("shows server failures without request IDs and a retry", async () => {
    server.use(http.get("*/api/v1/admin/users", () => HttpResponse.json({ error: { code: "UNAVAILABLE", message: "Try later" }, requestId: "req-users-503" }, { status: 503 })));
    mount(<Workspace resource={resource("users")} />);
    expect((await screen.findByRole("alert")).textContent).not.toContain("req-users-503");
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
    await userEvent.click(screen.getByRole("button", { name: "Reveal information" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain('does not collect a reason');
    expect(reads).toBe(0);
    await userEvent.click(within(dialog).getByRole("button", { name: "Reveal information" }));
    expect(await screen.findByText("+2348012345678")).toBeTruthy();
    expect(reads).toBe(1);
    expect(JSON.stringify(client.getQueryCache().getAll())).not.toContain("2348012345678");
    await userEvent.click(screen.getByRole("button", { name: "Hide sensitive data" }));
    expect(screen.queryByText("+2348012345678")).toBeNull();
  });

  it("requires a reason for case chat and can read later pages without caching messages", async () => {
    const cursors: (string | null)[] = [];
    server.use(http.get('*/api/v1/admin/disputes/dispute-1/chat', ({ request }) => {
      const query = new URL(request.url).searchParams;
      expect(query.get('reasonCode')).toBe('POLICY_VIOLATION');
      cursors.push(query.get('cursor'));
      return HttpResponse.json({ data: { conversationId: 'conversation-1', messages: [{ id: query.has('cursor') ? 'message-2' : 'message-1', content: query.has('cursor') ? 'Later evidence' : 'First evidence' }], meta: query.has('cursor') ? { hasNextPage: false } : { hasNextPage: true, nextCursor: 'later' } } });
    }));
    mount(<SensitiveGate path="/disputes/{id}/chat" id="dispute-1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Reveal with a reason' }));
    await screen.findByRole('option', { name: 'POLICY VIOLATION' });
    expect(cursors).toEqual([]);
    await userEvent.selectOptions(screen.getByLabelText(/Reason Code/), 'POLICY_VIOLATION');
    await userEvent.click(screen.getByRole('button', { name: 'Reveal information' }));
    await screen.findByText('First evidence');
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await screen.findByText('Later evidence');
    expect(screen.queryByText('First evidence')).toBeNull();
    expect(cursors).toEqual([null, 'later']);
    expect(JSON.stringify(client.getQueryCache().getAll())).not.toContain('evidence');
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
