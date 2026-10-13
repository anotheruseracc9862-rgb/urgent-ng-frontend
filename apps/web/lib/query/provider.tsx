'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

// Query-key roots that are never written to storage (Frontend PRD 22).
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
]);

export function isSensitiveKey(queryKey: readonly unknown[]): boolean {
  const root = queryKey[0];
  return typeof root === 'string' && SENSITIVE_ROOTS.has(root);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const persister = typeof window !== 'undefined' 
  ? createSyncStoragePersister({
      storage: window.localStorage,
      key: 'URGENT_QUERY_CACHE',
      serialize: (data) => JSON.stringify(data),
      deserialize: (data) => JSON.parse(data),
    })
  : undefined;

export function QueryProvider({ children }: { children: React.ReactNode }) {
  if (!persister) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            // Don't persist sensitive queries
            if (isSensitiveKey(query.queryKey)) {
              return false;
            }
            return query.state.status === 'success';
          },
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

export function clearQueryCache() {
  queryClient.clear();
  if (typeof window !== 'undefined') {
    localStorage.removeItem('URGENT_QUERY_CACHE');
  }
}
