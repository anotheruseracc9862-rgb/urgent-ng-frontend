'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

// Keys that should never be persisted
const SENSITIVE_KEY_PATTERNS = [
  /^chat/,
  /^conversations/,
  /^messages/,
  /^location/,
  /^verification/,
  /^admin/,
  /^trusted-contact/,
  /^disputes/,
];

function isSensitiveKey(queryKey: readonly unknown[]): boolean {
  const keyString = JSON.stringify(queryKey);
  return SENSITIVE_KEY_PATTERNS.some(pattern => pattern.test(keyString));
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
