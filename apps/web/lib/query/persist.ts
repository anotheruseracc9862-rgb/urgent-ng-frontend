import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import {
  APP_CACHE_VERSION,
  PERSIST_MAX_CHARS,
  PERSIST_STORAGE_KEY,
  shouldPersist,
} from './policy';

/** The cache belongs to one person and one app version. Anything else is discarded on restore. */
export function cacheBuster(userId: string): string {
  return `${APP_CACHE_VERSION}:${userId}`;
}

/** Keep only what policy allows, so an entry written by an older build cannot come back. */
export function filterPersistedClient(client: PersistedClient): PersistedClient {
  return {
    ...client,
    clientState: {
      mutations: [],
      queries: client.clientState.queries.filter((query) =>
        shouldPersist({ queryKey: query.queryKey, state: { status: query.state.status }, meta: query.meta }),
      ),
    },
  };
}

/** Storage that never throws: a full or blocked disk drops the cache instead of breaking the app. */
function safeStorage(storage: Storage): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  return {
    getItem: (key) => {
      try {
        return storage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key, value) => {
      try {
        storage.setItem(key, value);
      } catch {
        try {
          storage.removeItem(key);
        } catch {
          // Blocked storage: nothing to keep.
        }
      }
    },
    removeItem: (key) => {
      try {
        storage.removeItem(key);
      } catch {
        // Nothing to remove.
      }
    },
  };
}

export function createPersister(storage: Storage, throttleTime = 1000): Persister {
  const base = createSyncStoragePersister({
    storage: safeStorage(storage),
    key: PERSIST_STORAGE_KEY,
    throttleTime,
    serialize: (data) => {
      const text = JSON.stringify(filterPersistedClient(data));
      // Too large to be a speed-up: drop it rather than risk the quota.
      return text.length > PERSIST_MAX_CHARS
        ? JSON.stringify({ ...data, clientState: { queries: [], mutations: [] } })
        : text;
    },
    deserialize: (text) => {
      try {
        return JSON.parse(text) as PersistedClient;
      } catch {
        // A damaged entry is treated as no entry.
        return { timestamp: 0, buster: '', clientState: { queries: [], mutations: [] } } as PersistedClient;
      }
    },
  });
  return {
    persistClient: base.persistClient,
    removeClient: base.removeClient,
    restoreClient: async () => {
      const restored = await base.restoreClient();
      return restored ? filterPersistedClient(restored) : restored;
    },
  };
}

/** Remove the persisted cache. One function for every way a session ends. */
export function removePersistedCache(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PERSIST_STORAGE_KEY);
  } catch {
    // Storage can be blocked.
  }
}
