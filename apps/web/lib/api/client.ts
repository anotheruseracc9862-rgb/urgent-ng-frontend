/**
 * Typed fetch wrapper for the Urgent.ng API (Frontend PRD 24, 25).
 *
 * - Browser calls go to `/api/v1/*` on the web origin (Next rewrite, so cookies stay same-site).
 * - Server calls go straight to the API origin and forward the caller's cookies.
 * - Success envelopes `{ data, meta, requestId }` are unwrapped.
 * - Failures become `ApiError` with the stable backend `code`.
 * - A 401 triggers one single-flight refresh, then one retry.
 * - `POLICY_ACCEPTANCE_REQUIRED` sends the browser to the re-acceptance page.
 */

export interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
  requestId?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown>;
  readonly requestId?: string;

  constructor(status: number, code: string, message: string, details?: unknown, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details && typeof details === 'object' ? (details as Record<string, unknown>) : {};
    this.requestId = requestId;
  }

  /** Seconds the caller should wait, when the backend says so. */
  get retryAfterSeconds(): number | undefined {
    const value = this.details.retryAfterSeconds;
    return typeof value === 'number' ? value : undefined;
  }

  /** Field messages from a class-validator failure. */
  get fieldMessages(): string[] {
    const fields = this.details.fields;
    return Array.isArray(fields) ? fields.filter((f): f is string => typeof f === 'string') : [];
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Server only: the incoming `Cookie` header to forward. */
  cookie?: string;
  /** Skip the refresh-and-retry step (used by the refresh call itself). */
  noRefresh?: boolean;
  timeoutMs?: number;
}

const BROWSER_BASE = '/api/v1';
const SERVER_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

let refreshing: Promise<boolean> | null = null;

function baseUrl(): string {
  return typeof window === 'undefined' ? SERVER_BASE : BROWSER_BASE;
}

async function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch(`${BROWSER_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

function buildUrl(path: string, query?: ApiOptions['query']): string {
  const url = `${baseUrl()}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, query, headers, signal, cookie, noRefresh, timeoutMs = 20_000 } = options;

  const timeout = AbortSignal.timeout(timeoutMs);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  const finalHeaders: Record<string, string> = { Accept: 'application/json', ...headers };
  if (body !== undefined) finalHeaders['Content-Type'] = 'application/json';
  if (cookie) finalHeaders.Cookie = cookie;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: finalHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include',
      signal: combined,
      cache: 'no-store',
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection and try again.');
  }

  if (response.status === 204) return undefined as T;

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (response.ok) {
    if (payload && typeof payload === 'object' && 'data' in payload) {
      return (payload as { data: T }).data;
    }
    return payload as T;
  }

  const err = (payload ?? {}) as ApiErrorBody;
  const apiError = new ApiError(
    response.status,
    err.error?.code ?? `HTTP_${response.status}`,
    err.error?.message ?? 'Something went wrong. Please try again.',
    err.error?.details,
    err.requestId,
  );

  const inBrowser = typeof window !== 'undefined';

  if (inBrowser && response.status === 401 && !noRefresh && apiError.code === 'AUTH_REQUIRED') {
    if (await refreshSession()) {
      return api<T>(path, { ...options, noRefresh: true });
    }
  }

  if (inBrowser && apiError.code === 'POLICY_ACCEPTANCE_REQUIRED') {
    const here = window.location.pathname + window.location.search;
    // A full navigation on purpose: in-flight requests and page state are abandoned.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/policy-acceptance?redirect=${encodeURIComponent(here)}`);
  }

  throw apiError;
}

/** Only same-site relative paths are allowed as post-login destinations. */
export function safeRedirect(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value || !value.startsWith('/') || value.includes('\\')) return fallback;
  if (value.startsWith('//')) return fallback;
  try {
    const parsed = new URL(value, 'http://local.invalid');
    if (parsed.origin !== 'http://local.invalid') return fallback;
  } catch {
    return fallback;
  }
  return value;
}
