import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * Reads one `sessionStorage` key without a hydration mismatch.
 * Returns `undefined` on the server and during hydration, then the stored string or `null`.
 */
export function useSessionValue(key: string): string | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return sessionStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => undefined,
  );
}
