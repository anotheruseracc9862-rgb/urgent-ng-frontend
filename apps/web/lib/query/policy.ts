
/**
 * Bump when the shape of any cached response changes. A persisted cache with another version is
 * discarded on load instead of crashing a page on an old shape.
 */
export const APP_CACHE_VERSION = 'v3';

/** The localStorage key of the persisted cache. */
export const PERSIST_STORAGE_KEY = 'URGENT_QUERY_CACHE';

const HOUR = 60 * 60 * 1000;

/** How long a persisted answer may be shown after a reload. It is always refetched when it is stale. */
export const PERSIST_MAX_AGE = 12 * HOUR;

/** Freshness tiers. A page that mounts with data older than its tier refetches in the background. */
export const FRESHNESS = {
  /** Changes without the user acting, and is also driven by realtime events. */
  live: 15_000,
  /** The default: lists and summaries. */
  standard: 30_000,
  /** Changes rarely: a profile, a price list. */
  slow: 5 * 60_000,
  /** Near-static reference data. */
  static: HOUR,
} as const;

export type Freshness = keyof typeof FRESHNESS;

/** What a query declares about itself, through `meta`. */
export interface QueryPolicy {
  /** The answer may be kept in localStorage and painted again after a reload. Opt-in. */
  persist?: boolean;
}

declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: QueryPolicy;
  }
}

/**
 * Domains that must never reach browser storage, whatever a query declares. Exact addresses and
 * contacts, private chat, money, identity and security data live here (Frontend PRD §14, §32).
 */
const NEVER_PERSIST: ReadonlySet<string> = new Set([
  'auth',
  'account',
  'conversations',
  'billing',
  'verification',
  'blocks',
  'assignments',
  'notifications',
  // Legacy roots kept out as well.
  'me',
  'chat',
  'messages',
  'location',
  'locations',
  'trusted-contact',
  'disputes',
  'payments',
  'orders',
  'enforcement',
  'admin',
  'security',
  'consents',
  'media',
]);

/** Largest persisted payload, in characters. Over it, the cache is dropped rather than half-saved. */
export const PERSIST_MAX_CHARS = 1_500_000;

export function isNeverPersistedRoot(root: unknown): boolean {
  return typeof root === 'string' && NEVER_PERSIST.has(root);
}

interface Persistable {
  queryKey: readonly unknown[];
  state: { status: string };
  meta?: QueryPolicy | Record<string, unknown>;
}

/** The one rule for what is written to storage and what is accepted back from it. */
export function shouldPersist(query: Persistable): boolean {
  return (
    query.state.status === 'success' &&
    (query.meta as QueryPolicy | undefined)?.persist === true &&
    !isNeverPersistedRoot(query.queryKey[0])
  );
}
