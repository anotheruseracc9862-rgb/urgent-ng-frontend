/**
 * Lets code that must not depend on the query layer (the API client, the public header) clear
 * session-scoped caches. The query provider registers itself here when it loads; the persisted
 * cache key is removed regardless, so public pages never need to import TanStack Query.
 */

const PERSISTED_QUERY_CACHE_KEY = 'URGENT_QUERY_CACHE';
const clearers = new Set<() => void>();

export function onSessionCleared(clear: () => void): () => void {
  clearers.add(clear);
  return () => {
    clearers.delete(clear);
  };
}

export function clearSessionCaches(): void {
  clearers.forEach((clear) => clear());
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PERSISTED_QUERY_CACHE_KEY);
  } catch {
    // Storage can be blocked.
  }
}
