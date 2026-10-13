import {
  ApiError,
  isApiError,
  requestApi,
  type ApiMethod,
} from "@urgent/api-client";
import { clearSessionCaches } from "@/lib/auth/session-events";
import { clearPendingIdentity } from "@/lib/auth/pending-identity";

export { ApiError, isApiError };

export interface ApiOptions {
  method?: ApiMethod;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  cookie?: string;
  noRefresh?: boolean;
  /** Request may be used without a session; auth failures must not navigate from public UI. */
  optionalAuth?: boolean;
  timeoutMs?: number;
  noPolicyIntercept?: boolean;
}

const BROWSER_BASE = "/api/v1";
const SERVER_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000/api/v1";

type RefreshResult = "refreshed" | "expired";
let refreshing: Promise<RefreshResult> | null = null;
let loginRedirectStarted = false;
let policyNavigationStarted = false;
const pendingPolicyRequests: Array<() => Promise<void>> = [];

function baseUrl(): string {
  return typeof window === "undefined" ? SERVER_BASE : BROWSER_BASE;
}

export async function refreshBrowserSession(): Promise<RefreshResult> {
  if (!refreshing) {
    refreshing = requestApi("POST", "/auth/refresh", {
      baseUrl: BROWSER_BASE,
      body: {},
    })
      .then(() => {
        loginRedirectStarted = false;
        return "refreshed" as const;
      })
      .catch((error: unknown) => {
        if (isApiError(error) && error.status === 401) return "expired" as const;
        throw error;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

function redirectForApiError(error: ApiError): void {
  if (typeof window === "undefined") return;

  const destinations: Record<string, string> = {
    ACCOUNT_DEACTIVATED: "/account/standing",
    ACCOUNT_DELETION_PENDING: "/account/standing",
    ACCOUNT_SUSPENDED: "/account/standing",
  };
  const destination = destinations[error.code];
  if (destination && window.location.pathname !== destination) {
    window.location.assign(destination);
    return;
  }

}

function interceptPolicyRequest<T>(path: string, options: ApiOptions): Promise<T> {
  if (typeof window === "undefined") {
    return Promise.reject(new ApiError(403, "POLICY_ACCEPTANCE_REQUIRED", "Accept the latest policies to continue."));
  }

  const redirect = window.location.pathname + window.location.search;
  if (!policyNavigationStarted) {
    policyNavigationStarted = true;
    window.dispatchEvent(
      new CustomEvent("urgent:policy-acceptance-required", { detail: { redirect } }),
    );
  }

  return new Promise<T>((resolve, reject) => {
    pendingPolicyRequests.push(async () => {
      try {
        resolve(await api<T>(path, { ...options, noPolicyIntercept: true }));
      } catch (error) {
        reject(error);
      }
    });
  });
}

export async function replayPendingPolicyRequests(): Promise<void> {
  const pending = pendingPolicyRequests.splice(0);
  policyNavigationStarted = false;
  await Promise.all(pending.map((replay) => replay()));
}

export function clearBrowserSession(): void {
  clearSessionCaches();
  try {
    clearPendingIdentity();
    sessionStorage.clear();
  } catch {
    // Storage can be blocked.
  }
}

function navigateClient(href: string, replace: boolean): void {
  window.dispatchEvent(
    new CustomEvent("urgent:auth-navigation", { detail: { href, replace } }),
  );
}

function redirectToLogin(): void {
  if (typeof window === "undefined" || loginRedirectStarted) return;
  loginRedirectStarted = true;
  clearBrowserSession();
  const here = window.location.pathname + window.location.search;
  navigateClient(`/login?reason=session-expired&redirect=${encodeURIComponent(here)}`, true);
}

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const {
    method = "GET",
    body,
    query,
    headers,
    signal,
    cookie,
    noRefresh,
    optionalAuth,
    timeoutMs,
    noPolicyIntercept,
  } = options;

  try {
    const result = await requestApi<T>(method, path, {
      baseUrl: baseUrl(),
      query,
      body,
      headers,
      signal,
      cookie,
      timeoutMs,
    });
    return result.data;
  } catch (error) {
    if (!isApiError(error)) throw error;

    const inBrowser = typeof window !== "undefined";
    if (inBrowser && error.code === "POLICY_ACCEPTANCE_REQUIRED" && !noPolicyIntercept && !optionalAuth) {
      return interceptPolicyRequest<T>(path, options);
    }

    if (inBrowser && error.status === 401 && !noRefresh && error.code === "AUTH_REQUIRED") {
      if ((await refreshBrowserSession()) === "refreshed") {
        return api<T>(path, { ...options, noRefresh: true });
      }
      if (optionalAuth) clearBrowserSession();
      else redirectToLogin();
    }

    if (!optionalAuth) redirectForApiError(error);

    throw error;
  }
}

/** Only same-site relative paths are allowed as post-login destinations. */
export function safeRedirect(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value || !value.startsWith("/") || value.includes("\\")) return fallback;
  if (value.startsWith("//")) return fallback;
  try {
    const parsed = new URL(value, "http://local.invalid");
    if (parsed.origin !== "http://local.invalid") return fallback;
  } catch {
    return fallback;
  }
  return value;
}
