import { ApiError, requestApi, type ApiMethod, type ApiRequestOptions, type ApiResult } from "@urgent/api-client";
import { ADMIN_EXPIRED_EVENT } from "../auth/shared";

export type AdminRequestOptions = ApiRequestOptions & { method?: ApiMethod; noRefresh?: boolean };
export const ADMIN_API_PREFIX = "/api/v1/admin";
let refreshFlight: Promise<void> | undefined;

export function refreshAdminSession(): Promise<void> {
  if (!refreshFlight) {
    refreshFlight = requestApi("POST", "/auth/refresh", { baseUrl: ADMIN_API_PREFIX, body: {} })
      .then(() => undefined).finally(() => { refreshFlight = undefined; });
  }
  return refreshFlight;
}

export function expireAdminSession(requestId?: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ADMIN_EXPIRED_EVENT));
  const query = new URLSearchParams({ expired: "1" });
  if (requestId) query.set("requestId", requestId);
  if (window.location.pathname !== "/login") window.location.replace(`/login?${query}`);
}

export async function adminRequest<T>(path: string, options: AdminRequestOptions = {}): Promise<ApiResult<T>> {
  if (!path.startsWith("/") || path.startsWith("//") || /[\\#]/.test(path) || path.split("/").some((part) => part === ".." || /%2e|%2f|%5c/i.test(part))) {
    throw new TypeError("Use an admin-relative API path, for example /users.");
  }
  const { method = "GET", noRefresh = false, ...input } = options;
  const request = () => requestApi<T>(method, path, { ...input, baseUrl: ADMIN_API_PREFIX, credentials: "include" });
  try { return await request(); } catch (error) {
    const publicAuth = ["/auth/login", "/auth/mfa/enrol", "/auth/mfa/verify", "/auth/refresh", "/auth/accept-invite"].includes(path.split("?")[0]);
    if (!(error instanceof ApiError) || error.status !== 401 || noRefresh || publicAuth) throw error;
    try { await refreshAdminSession(); } catch (refreshError) {
      if (refreshError instanceof ApiError && refreshError.status === 401) expireAdminSession(refreshError.requestId);
      throw refreshError;
    }
    // Only an explicit authentication rejection permits replay, never a timeout/network failure.
    try { return await request(); } catch (retryError) {
      if (retryError instanceof ApiError && retryError.status === 401) expireAdminSession(retryError.requestId);
      throw retryError;
    }
  }
}

export async function adminApi<T>(path: string, options?: AdminRequestOptions): Promise<T> {
  return (await adminRequest<T>(path, options)).data;
}

export function adminErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return `${error.message}${error.requestId ? ` (Request ID: ${error.requestId})` : ""}`;
  return "Something went wrong. Please try again.";
}
