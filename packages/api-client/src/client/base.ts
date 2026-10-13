import { ApiError } from "../errors/api-error";

export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiMeta {
  nextCursor?: string | null;
  [key: string]: unknown;
}

export interface ApiResult<T> {
  data: T;
  meta?: ApiMeta;
  requestId?: string;
  status: number;
  headers: Headers;
}

export interface ApiRequestOptions {
  baseUrl?: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: HeadersInit;
  idempotencyKey?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  cookie?: string;
  credentials?: RequestCredentials;
}

export interface InfiniteListInput {
  cursor?: string;
  limit?: number;
}

export type UseInfiniteListInput = InfiniteListInput;

interface SuccessEnvelope<T> {
  data: T;
  meta?: ApiMeta;
  requestId?: string;
}

interface ErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
  requestId?: string;
}

const DEFAULT_BASE_URL = "/api/v1";
const DEFAULT_TIMEOUT_MS = 15_000;

function buildUrl(
  baseUrl: string,
  path: string,
  query?: ApiRequestOptions["query"],
): string {
  const joinedPath = `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  const isAbsolute = /^[a-z][a-z\d+.-]*:/i.test(joinedPath);
  const url = new URL(joinedPath, isAbsolute ? undefined : "http://localhost");

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  return isAbsolute ? url.toString() : `${url.pathname}${url.search}`;
}

function parseSuccess<T>(payload: unknown): Omit<ApiResult<T>, "status" | "headers"> {
  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    throw new ApiError(502, "INVALID_RESPONSE", "The server returned an invalid response.");
  }

  const envelope = payload as SuccessEnvelope<T>;
  return {
    data: envelope.data,
    ...(envelope.meta === undefined ? {} : { meta: envelope.meta }),
    ...(envelope.requestId === undefined ? {} : { requestId: envelope.requestId }),
  };
}

export async function api<T>(
  method: ApiMethod,
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiResult<T>> {
  const {
    baseUrl = DEFAULT_BASE_URL,
    query,
    body,
    headers: inputHeaders,
    idempotencyKey,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    cookie,
    credentials = "include",
  } = options;

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError("timeoutMs must be a positive finite number.");
  }

  const headers = new Headers(inputHeaders);
  headers.set("Accept", "application/json");
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey);
  if (cookie) headers.set("Cookie", cookie);
  const requestBody = body === undefined ? undefined : JSON.stringify(body);

  const controller = new AbortController();
  let didTimeout = false;
  const forwardAbort = () => controller.abort(signal?.reason);
  if (signal?.aborted) {
    forwardAbort();
  } else {
    signal?.addEventListener("abort", forwardAbort, { once: true });
  }
  const timer = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(buildUrl(baseUrl, path, query), {
      method,
      headers,
      body: requestBody,
      credentials,
      cache: "no-store",
      signal: controller.signal,
    });

    if (response.status === 204) {
      return { data: undefined as T, status: response.status, headers: response.headers };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      if (signal?.aborted || didTimeout) throw error;
      payload = undefined;
    }

    if (!response.ok) {
      const envelope = payload && typeof payload === "object" ? (payload as ErrorEnvelope) : {};
      throw new ApiError(
        response.status,
        envelope.error?.code ?? `HTTP_${response.status}`,
        envelope.error?.message ?? "Something went wrong. Please try again.",
        envelope.error?.details,
        envelope.requestId,
        response.headers,
      );
    }

    return { ...parseSuccess<T>(payload), status: response.status, headers: response.headers };
  } catch (error) {
    if (error instanceof ApiError || signal?.aborted) throw error;
    if (didTimeout) {
      throw new ApiError(0, "REQUEST_TIMEOUT", "The request timed out. Please try again.");
    }
    throw new ApiError(0, "NETWORK_ERROR", "Could not reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forwardAbort);
  }
}

export const requestApi = api;

export function newIdempotencyKey(): string {
  return globalThis.crypto.randomUUID();
}

export function getNextCursor(meta?: ApiMeta): string | undefined {
  return typeof meta?.nextCursor === "string" ? meta.nextCursor : undefined;
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
}

export type RequestConfig = Omit<RequestInit, "method"> & {
  url: string;
  method?: ApiMethod;
  params?: Record<string, string | number | boolean | undefined>;
  data?: unknown;
};

export class ApiClient {
  constructor(private readonly baseURL: string) {}

  async request<T = unknown>(config: RequestConfig): Promise<ApiResponse<T>> {
    const { url, params, data, method = "GET", headers, signal, credentials } = config;
    const result = await requestApi<T>(method, url, {
      baseUrl: this.baseURL,
      query: params,
      body: data,
      headers,
      signal: signal ?? undefined,
      credentials,
    });
    return { data: result.data, status: result.status, headers: result.headers };
  }

  get<T = unknown>(
    url: string,
    params?: RequestConfig["params"],
    config?: Omit<RequestConfig, "url" | "params" | "data">,
  ) {
    return this.request<T>({ ...config, url, params, method: "GET" });
  }

  post<T = unknown>(
    url: string,
    data?: unknown,
    config?: Omit<RequestConfig, "url" | "data">,
  ) {
    return this.request<T>({ ...config, url, data, method: "POST" });
  }

  put<T = unknown>(
    url: string,
    data?: unknown,
    config?: Omit<RequestConfig, "url" | "data">,
  ) {
    return this.request<T>({ ...config, url, data, method: "PUT" });
  }

  patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: Omit<RequestConfig, "url" | "data">,
  ) {
    return this.request<T>({ ...config, url, data, method: "PATCH" });
  }

  delete<T = unknown>(
    url: string,
    config?: Omit<RequestConfig, "url">,
  ) {
    return this.request<T>({ ...config, url, method: "DELETE" });
  }
}
