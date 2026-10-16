import { FRESHNESS, PERSIST_MAX_AGE, type Freshness } from './policy';

/**
 * Policy for a query whose answer may be painted again after a reload. Opt-in: only list-level
 * data without exact addresses or contacts (see `NEVER_PERSIST` in `policy.ts`). Memory is kept for
 * as long as the answer may be restored, otherwise it would be dropped before a reload could use it.
 */
export function persistedQuery(freshness: Freshness = 'standard') {
  return {
    staleTime: FRESHNESS[freshness],
    gcTime: PERSIST_MAX_AGE,
    meta: { persist: true },
  } as const;
}

/** Policy for an ordinary query: fresh for a tier, never written to storage. */
export function liveQuery(freshness: Freshness = 'standard') {
  return { staleTime: FRESHNESS[freshness] } as const;
}
