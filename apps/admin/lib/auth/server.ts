import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError, requestApi } from "@urgent/api-client";
import { env } from "../env";
import { safeAdminReturnTo, type AdminView } from "./shared";
export type { AdminView } from "./shared";
export { DEFAULT_IDLE_SECONDS } from "./shared";

export async function getAdminSession(): Promise<AdminView | null> {
  const token = (await cookies()).get("ung_admin_at")?.value;
  if (!token) return null;
  try {
    return (await requestApi<AdminView>("GET", "/auth/me", {
      baseUrl: env.NEXT_PUBLIC_ADMIN_API_URL,
      cookie: `ung_admin_at=${encodeURIComponent(token)}`,
    })).data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export async function requireAdminSession(returnTo = "/dashboard"): Promise<AdminView> {
  const admin = await getAdminSession();
  // Refresh cookie is scoped to /api/v1/admin/auth and cannot be read on a page.
  if (!admin) redirect(`/session?returnTo=${encodeURIComponent(safeAdminReturnTo(returnTo))}`);
  return admin;
}
