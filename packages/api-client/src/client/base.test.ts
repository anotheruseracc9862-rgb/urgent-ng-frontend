import { afterEach, describe, expect, it, vi } from "vitest";
import { getNextCursor, newIdempotencyKey, requestApi } from "./base";
import { ApiError } from "../errors/api-error";

function respond(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("requestApi()", () => {
  it("unwraps data and retains cursor metadata and the request id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        respond(200, {
          data: [{ id: "item-1" }],
          meta: { nextCursor: "cursor-2" },
          requestId: "req_1",
        }),
      ),
    );

    const result = await requestApi("GET", "/items", {
      query: { limit: 10, archived: false },
    });

    expect(result.data).toEqual([{ id: "item-1" }]);
    expect(result.meta).toEqual({ nextCursor: "cursor-2" });
    expect(result.requestId).toBe("req_1");
    expect(getNextCursor(result.meta)).toBe("cursor-2");
    expect(String(vi.mocked(fetch).mock.calls[0]?.[0])).toBe(
      "/api/v1/items?limit=10&archived=false",
    );
    expect(vi.mocked(fetch).mock.calls[0]?.[1]).toMatchObject({
      credentials: "include",
      cache: "no-store",
    });
  });

  it("sends JSON and the idempotency key on mutating requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respond(201, { data: { id: "item-1" } }));
    vi.stubGlobal("fetch", fetchMock);

    await requestApi("POST", "/items", {
      body: { title: "Groceries" },
      idempotencyKey: "intent-1",
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
    expect(new Headers(init.headers).get("Idempotency-Key")).toBe("intent-1");
    expect(init.body).toBe(JSON.stringify({ title: "Groceries" }));
  });

  it("normalizes backend errors while preserving code, request id and Retry-After", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        respond(
          429,
          {
            error: { code: "RATE_LIMITED", message: "Try again later." },
            requestId: "req_429",
          },
          { "Retry-After": "30" },
        ),
      ),
    );

    await expect(requestApi("GET", "/items")).rejects.toMatchObject({
      name: "ApiError",
      code: "RATE_LIMITED",
      category: "rate_limited",
      status: 429,
      requestId: "req_429",
      retryAfterSeconds: 30,
    });
  });

  it("preserves details and maps validation errors to the validation category", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        respond(400, {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input.",
            details: { fields: ["name"] },
          },
          requestId: "req_validation",
        }),
      ),
    );

    const error = await requestApi("POST", "/items", { body: {} }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      category: "validation",
      code: "VALIDATION_ERROR",
      requestId: "req_validation",
      fieldMessages: ["name"],
    });
  });

  it("keeps caller cancellation distinct from a network failure", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      Promise.reject(init?.signal?.reason),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestApi("GET", "/items", { signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  it("reports timeout as a typed network-category error", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const pending = requestApi("GET", "/items", { timeoutMs: 20 });
    const assertion = expect(pending).rejects.toMatchObject({
      code: "REQUEST_TIMEOUT",
      category: "network",
      status: 0,
    });
    await vi.advanceTimersByTimeAsync(20);
    await assertion;
  });

  it("creates UUID idempotency keys", () => {
    expect(newIdempotencyKey()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
