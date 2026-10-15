import type { AdminView } from "@/lib/auth/shared";
import type { Resource } from "./catalog";
import { endpoint, type Endpoint } from "./contracts";

export function allowed(admin: AdminView, operation: Endpoint): boolean {
  return operation.permissions.every(permission => admin.permissions.includes(permission));
}

export function canVisit(admin: AdminView, resource: Resource): boolean {
  const primary = resource.list ?? resource.lookup;
  if (primary) return allowed(admin, endpoint("GET", primary));
  if (resource.slug === "media") return admin.permissions.some(p => ["SENSITIVE_DATA_VIEW", "CHAT_SENSITIVE_VIEW", "LOCATION_EXACT_VIEW"].includes(p));
  return (resource.actions ?? []).some(a => allowed(admin, endpoint(a.method, a.path))) ||
    (resource.related ?? []).some(r => allowed(admin, endpoint("GET", r.path)));
}

export function valueAt(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined, value);
}

/** IDs are URL segments, never caller-supplied paths. */
export function recordPath(path: string, id: string): string {
  return path.replace(/\{[^}]+\}/g, () => encodeURIComponent(id));
}

export function labelFor(key: string): string {
  if (key === "q") return "Search";
  return key.replace(/^data\./, "").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replaceAll("_", " ").replaceAll("-", " ").replace(/^./, s => s.toUpperCase());
}
