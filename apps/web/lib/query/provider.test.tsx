import * as React from 'react';
import { QueryClient, QueryClientProvider, dehydrate, useQuery, useQueryClient } from '@tanstack/react-query';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useApiMutation } from './mutations';
import { queryKeys } from './keys';
import {
  clearQueryCache,
  createServerQueryClient,
  isPersistableKey,
  isSensitiveKey,
  prefetchServerQuery,
  QueryProvider,
  setCurrentSessionUserId,
} from './provider';

function CacheProbe({ onClient }: { onClient: (client: QueryClient) => void }) {
  const client = useQueryClient();
  React.useEffect(() => {
    onClient(client);
  }, [client, onClient]);
  return null;
}

beforeEach(() => {
  clearQueryCache();
  setCurrentSessionUserId(null);
  localStorage.clear();
});

afterEach(() => {
  clearQueryCache();
  setCurrentSessionUserId(null);
  localStorage.clear();
});

describe('query persistence', () => {
  it('allows only public reference-data keys to be persisted', () => {
    expect(isPersistableKey(queryKeys.reference.categories())).toBe(true);
    expect(isPersistableKey(queryKeys.reference.policies('TERMS_OF_SERVICE'))).toBe(true);
    expect(isPersistableKey(queryKeys.errands.all())).toBe(false);
    expect(isPersistableKey(queryKeys.auth.me('user-1'))).toBe(false);
    expect(isSensitiveKey(queryKeys.conversations.messages('conversation-1'))).toBe(true);
    expect(isSensitiveKey(['orders', 'list'])).toBe(true);
  });

  it('never writes private query data to browser storage', async () => {
    function CacheWriter() {
      useQuery({
        queryKey: queryKeys.reference.categories(),
        queryFn: async () => [{ name: 'Public category' }],
      });
      useQuery({
        queryKey: queryKeys.auth.me('user-1'),
        queryFn: async () => ({ name: 'Private user name' }),
      });
      useQuery({
        queryKey: queryKeys.conversations.messages('conversation-1'),
        queryFn: async () => [{ text: 'Private message' }],
      });
      return null;
    }

    render(
      <QueryProvider>
        <CacheWriter />
      </QueryProvider>,
    );

    await waitFor(
      () => expect(localStorage.getItem('URGENT_QUERY_CACHE')).toContain('Public category'),
      { timeout: 5000 },
    );
    const persisted = localStorage.getItem('URGENT_QUERY_CACHE') ?? '';
    expect(persisted).not.toContain('Private user name');
    expect(persisted).not.toContain('Private message');
  });

  it('clears the in-memory and persisted caches on logout and account change', async () => {
    const clients: QueryClient[] = [];
    render(
      <QueryProvider>
        <CacheProbe onClient={(client) => clients.push(client)} />
      </QueryProvider>,
    );
    await waitFor(() => expect(clients.length).toBeGreaterThan(0));

    const client = clients[0]!;
    client.setQueryData(queryKeys.reference.categories(), ['cached']);
    localStorage.setItem('URGENT_QUERY_CACHE', 'persisted');
    setCurrentSessionUserId('user-1');
    setCurrentSessionUserId('user-2');
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    expect(localStorage.getItem('URGENT_QUERY_CACHE')).toBeNull();

    client.setQueryData(queryKeys.reference.categories(), ['cached']);
    localStorage.setItem('URGENT_QUERY_CACHE', 'persisted');
    clearQueryCache();
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    expect(localStorage.getItem('URGENT_QUERY_CACHE')).toBeNull();
  });
});

describe('server query hydration helpers', () => {
  it('prefetches data into a request-scoped client that can be dehydrated', async () => {
    const client = createServerQueryClient();
    await prefetchServerQuery(client, {
      queryKey: queryKeys.reference.categories(),
      queryFn: async () => [{ id: 'cat-1' }],
    });

    expect(client.getQueryData(queryKeys.reference.categories())).toEqual([{ id: 'cat-1' }]);
    expect(dehydrate(client).queries).toHaveLength(1);
  });
});

describe('useApiMutation()', () => {
  it('invalidates the mapped query prefixes after success', async () => {
    const client = new QueryClient();
    const listKey = queryKeys.errands.list({ status: 'ACTIVE' });
    client.setQueryData(listKey, [{ id: 'old' }]);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () =>
        useApiMutation({
          mutationFn: async () => ({ id: 'new' }),
          invalidates: ['createErrand'],
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.mutateAsync();
    });
    expect(client.getQueryState(listKey)?.isInvalidated).toBe(true);
    client.clear();
  });
});
