'use client';

import * as React from 'react';
import {
  HydrationBoundary,
  QueryClientProvider,
  type DehydratedState,
  type FetchQueryOptions,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { onSessionCleared } from '@/lib/auth/session-events';
import { broadcastClear, listenForOtherTabs } from './broadcast';
import { createQueryClient, getQueryClient, peekBrowserQueryClient } from './client';
import { cacheBuster, createPersister, removePersistedCache } from './persist';
import { PERSIST_MAX_AGE, isNeverPersistedRoot, shouldPersist } from './policy';

/** Kept for existing callers and tests: is this whole family barred from browser storage? */
export function isSensitiveKey(queryKey: readonly unknown[]): boolean {
  return isNeverPersistedRoot(queryKey[0]);
}

/** Kept for existing callers and tests: could a query with this key be persisted when it opts in? */
export function isPersistableKey(queryKey: readonly unknown[]): boolean {
  return shouldPersist({ queryKey, state: { status: 'success' }, meta: { persist: true } });
}

export function createServerQueryClient(): QueryClient {
  return createQueryClient();
}

export async function prefetchServerQuery<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  queryClient: QueryClient,
  options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
): Promise<void> {
  await queryClient.prefetchQuery(options);
}

export function QueryHydrationBoundary({
  state,
  children,
}: {
  state: DehydratedState;
  children: React.ReactNode;
}) {
  return <HydrationBoundary state={state}>{children}</HydrationBoundary>;
}

let currentSessionUserId: string | null = null;

/** Everything this tab holds for the previous person: memory, storage and the other tabs. */
export function clearQueryCache(): void {
  peekBrowserQueryClient()?.clear();
  removePersistedCache();
  broadcastClear();
}

export function setCurrentSessionUserId(userId: string | null): void {
  if (typeof window === 'undefined' || currentSessionUserId === userId) return;
  if (currentSessionUserId !== null && userId !== currentSessionUserId) clearQueryCache();
  currentSessionUserId = userId;
}

// Sign-out from code that does not import this module (API client, public header) lands here.
onSessionCleared(() => {
  peekBrowserQueryClient()?.clear();
  removePersistedCache();
  broadcastClear();
  currentSessionUserId = null;
});

/**
 * Query cache for every non-marketing page. In memory only: the persisted copy is added by
 * `PersistedCache` once the signed-in person is known, so it can be scoped to them.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(getQueryClient);

  React.useEffect(
    () => listenForOtherTabs(client, () => {
      // Another tab signed out or switched account: drop this tab's copy too, without echoing.
      client.clear();
      removePersistedCache();
    }),
    [client],
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/**
 * Paints the last known answers straight away after a reload, then refetches what is stale.
 * Scoped to one person and one app version through the buster. Mounted by the signed-in layout.
 */
export function PersistedCache({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [client] = React.useState(getQueryClient);
  const [persister] = React.useState(() => (typeof window === 'undefined' ? undefined : createPersister(window.localStorage)));

  React.useEffect(() => {
    setCurrentSessionUserId(userId);
  }, [userId]);

  if (!persister) return <>{children}</>;

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: PERSIST_MAX_AGE,
        buster: cacheBuster(userId),
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            shouldPersist({ queryKey: query.queryKey, state: { status: query.state.status }, meta: query.meta }),
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
