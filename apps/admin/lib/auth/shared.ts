import type { components } from "@urgent/api-client";

export type AdminView = components["schemas"]["AdminViewDto"];
export const DEFAULT_IDLE_SECONDS = 900;
export const ADMIN_EXPIRED_EVENT = "urgent-admin:expired";
export const ADMIN_IDLE_KEY = "urgent-admin:idle";

export function safeAdminReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\s]|%2f|%5c|%0[0-9a-f]/i.test(value)) return "/dashboard";
  const url = new URL(value, "http://admin.local");
  const path = url.pathname.replace(/\/+$/, "");
  if (["/login", "/session", "/accept-invite"].includes(path) || path === "/api" || path.startsWith("/api/")) return "/dashboard";
  return `${url.pathname}${url.search}${url.hash}`;
}
