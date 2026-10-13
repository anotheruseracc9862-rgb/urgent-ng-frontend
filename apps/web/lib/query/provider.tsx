'use client';

import * as React from 'react';
import {
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
  type DehydratedState,
  type FetchQueryOptions,
  type QueryKey,
} from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { onSessionCleared } from '@/lib/auth/session-events';

// Sensitive query families must not be persisted even if the allow-list changes later.
const SENSITIVE_ROOTS = new Set([
  'auth',
  'me',
  'chat',
  'conversations',
  'messages',
  'location',
  'locations',
  'verification',
  'admin',
  'trusted-contact',
  'disputes',
  'payments',
  'orders',
  'enforcement',
]);

export function isSensitiveKey(queryKey: readonly unknown[]): boolean {
  const root = queryKey[0];
  return typeof root === 'string' && SENSITIVE_ROOTS.has(root);
}

export function isPersistableKey(queryKey: readonly unknown[]): boolean {
  return queryKey[0] === 'reference' && (queryKey[1] === 'categories' || queryKey[1] === 'policies');
}

function createQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
  queryClient.setQueryDefaults(['reference'], {
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
  return queryClient;
}

let browserQueryClient: QueryClient | undefined;
let currentSessionUserId: string | null = null;

function getQueryClient() {
  if (typeof window === 'undefined') return createQueryClient();
  browserQueryClient ??= createQueryClient();
  return browserQueryClient;
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

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(getQueryClient);
  const [persister] = React.useState(() =>
    typeof window !== 'undefined'
      ? createSyncStoragePersister({
          storage: window.localStorage,
          key: 'URGENT_QUERY_CACHE',
          serialize: (data) => JSON.stringify(data),
          deserialize: (data) => JSON.parse(data),
        })
      : undefined,
  );

  if (!persister) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        buster: 'urgent-query-cache-v2',
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            return (
              query.state.status === 'success' &&
              !isSensitiveKey(query.queryKey) &&
              isPersistableKey(query.queryKey)
            );
          },
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

// Sign-out from code that does not import this module (API client, public header) lands here.
onSessionCleared(() => {
  browserQueryClient?.clear();
  currentSessionUserId = null;
});

export function clearQueryCache() {
  browserQueryClient?.clear();
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('URGENT_QUERY_CACHE');
    } catch {
      // Storage can be blocked.
    }
  }
}

export function setCurrentSessionUserId(userId: string | null): void {
  if (typeof window === 'undefined' || currentSessionUserId === userId) return;
  if (currentSessionUserId !== null && userId !== currentSessionUserId) clearQueryCache();
  currentSessionUserId = userId;
}
