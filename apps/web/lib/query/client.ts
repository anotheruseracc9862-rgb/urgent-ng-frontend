import { MutationCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from '@urgent/api-client';
import { broadcastInvalidation } from './broadcast';
import type { Domain } from './domains';
import { invalidateDomains } from './domains';
import { FRESHNESS } from './policy';

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /** Domains this write changes. Everything derived from them refreshes (`lib/query/domains.ts`). */
      affects?: readonly Domain[];
    };
  }
}

/** Answers to keep in memory when nothing is looking at them. Persisted queries set their own (see `persistedQuery`). */
const MEMORY_GC = 30 * 60_000;

/** Retry a transient failure once or twice; a 4xx is the server's answer and will not change on a retry. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return true;
}

declare global {
  interface Window {
    /** The browser's query client, so code outside React (sign-out, token refresh) can clear it. */
    __URGENT_QUERY_CLIENT__?: QueryClient;
  }
}

export function createQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    mutationCache: new MutationCache({
      onSuccess: (_data, _variables, _context, mutation) => {
        const affects = mutation.meta?.affects;
        if (!affects || affects.length === 0) return;
        // The mutation that declared `affects` has already refreshed this tab; tell the others.
        broadcastInvalidation(affects);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: FRESHNESS.standard,
        gcTime: MEMORY_GC,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        // Show what we have on a poor connection and keep trying; the connection banner explains it.
        networkMode: 'offlineFirst',
        retry: shouldRetry,
      },
      // A write must fail fast offline, never wait silently and run later.
      mutations: { networkMode: 'always' },
    },
  });
  client.setQueryDefaults(['reference'], { staleTime: FRESHNESS.static });
  return client;
}

let browserClient: QueryClient | undefined;

/** One client per browser, a fresh one per server render (a shared one would leak between requests). */
export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') return createQueryClient();
  if (!browserClient) {
    browserClient = createQueryClient();
    window.__URGENT_QUERY_CLIENT__ = browserClient;
  }
  return browserClient;
}

export function peekBrowserQueryClient(): QueryClient | undefined {
  return browserClient;
}

/** Refresh domains in this tab and tell the others. For code that is not a mutation. */
export async function refreshDomains(client: QueryClient, domains: readonly Domain[]): Promise<void> {
  await invalidateDomains(client, domains);
  broadcastInvalidation(domains);
}
