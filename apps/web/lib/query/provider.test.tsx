import * as React from 'react';
import { QueryClient, QueryClientProvider, dehydrate, useQuery, useQueryClient } from '@tanstack/react-query';
import { persistQueryClientRestore } from '@tanstack/react-query-persist-client';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { domainsForEvent, expandDomains } from './domains';
import { useApiMutation } from './mutations';
import { cacheBuster, createPersister, filterPersistedClient } from './persist';
import { persistedQuery } from './persisted-query';
import { APP_CACHE_VERSION, PERSIST_STORAGE_KEY, isNeverPersistedRoot, shouldPersist } from './policy';
import { queryKeys } from './keys';
import {
  clearQueryCache,
  createServerQueryClient,
  PersistedCache,
  prefetchServerQuery,
  QueryProvider,
  setCurrentSessionUserId,
} from './provider';

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

const success = { status: 'success' };
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe('persistence policy', () => {
  it('persists only queries that opt in, and never a barred family', () => {
    expect(shouldPersist({ queryKey: ['errands', 'mine'], state: success, meta: { persist: true } })).toBe(true);
    expect(shouldPersist({ queryKey: ['errands', 'mine'], state: success })).toBe(false);
    expect(shouldPersist({ queryKey: ['errands', 'mine'], state: success, meta: { persist: false } })).toBe(false);
    for (const root of ['auth', 'conversations', 'billing', 'verification', 'assignments', 'notifications', 'blocks']) {
      expect(isNeverPersistedRoot(root)).toBe(true);
      expect(shouldPersist({ queryKey: [root, 'x'], state: success, meta: { persist: true } })).toBe(false);
    }
  });

  it('never persists an error or a pending query', () => {
    expect(shouldPersist({ queryKey: ['errands'], state: { status: 'error' }, meta: { persist: true } })).toBe(false);
    expect(shouldPersist({ queryKey: ['errands'], state: { status: 'pending' }, meta: { persist: true } })).toBe(false);
  });

  it('drops barred and unmarked entries when restoring, so an older build cannot bring them back', () => {
    const entry = (queryKey: unknown[], meta?: Record<string, unknown>) => ({
      queryKey,
      queryHash: JSON.stringify(queryKey),
      state: { status: 'success', data: 1, dataUpdatedAt: 1, error: null, errorUpdatedAt: 0, fetchStatus: 'idle' },
      meta,
    });
    const restored = filterPersistedClient({
      timestamp: 1,
      buster: 'x',
      clientState: {
        mutations: [],
        queries: [
          entry(['errands', 'mine'], { persist: true }),
          entry(['errands', 'detail', 'e1']),
          entry(['conversations', 'messages', 'c1'], { persist: true }),
        ],
      },
    } as never);
    expect(restored.clientState.queries.map((q) => q.queryKey)).toEqual([['errands', 'mine']]);
  });

  it('gives a persisted query a memory lifetime long enough to be restored', () => {
    const policy = persistedQuery('standard');
    expect(policy.meta).toEqual({ persist: true });
    expect(policy.gcTime).toBeGreaterThanOrEqual(12 * 60 * 60 * 1000);
  });
});

describe('persister', () => {
  const dehydratedWith = async (userId: string) => {
    const writer = new QueryClient();
    await writer.prefetchQuery({ queryKey: ['errands', 'mine'], queryFn: async () => ['kept'], ...persistedQuery() });
    await writer.prefetchQuery({ queryKey: ['conversations', 'detail', 'c'], queryFn: async () => ['private'], meta: { persist: true } });
    const persister = createPersister(localStorage, 0);
    await persister.persistClient({
      timestamp: Date.now(),
      buster: cacheBuster(userId),
      clientState: dehydrate(writer, { shouldDehydrateQuery: (q) => shouldPersist({ queryKey: q.queryKey, state: q.state, meta: q.meta }) }),
    });
    await settle();
    return persister;
  };

  it('restores the person\'s own answers and nothing barred', async () => {
    const persister = await dehydratedWith('user-1');
    const reader = new QueryClient();
    await persistQueryClientRestore({ queryClient: reader, persister, buster: cacheBuster('user-1'), maxAge: 60_000 });
    expect(reader.getQueryData(['errands', 'mine'])).toEqual(['kept']);
    expect(reader.getQueryData(['conversations', 'detail', 'c'])).toBeUndefined();
  });

  it('discards another person\'s cache and another app version', async () => {
    const persister = await dehydratedWith('user-1');
    const other = new QueryClient();
    await persistQueryClientRestore({ queryClient: other, persister, buster: cacheBuster('user-2'), maxAge: 60_000 });
    expect(other.getQueryData(['errands', 'mine'])).toBeUndefined();
    expect(localStorage.getItem(PERSIST_STORAGE_KEY)).toBeNull();
    expect(cacheBuster('u')).toBe(`${APP_CACHE_VERSION}:u`);
  });

  it('survives a full or blocked disk', async () => {
    const broken = {
      getItem: () => null,
      setItem: () => { throw new DOMException('Quota', 'QuotaExceededError'); },
      removeItem: () => { throw new Error('blocked'); },
    } as unknown as Storage;
    const persister = createPersister(broken, 0);
    expect(() => persister.persistClient({ timestamp: 1, buster: 'b', clientState: { queries: [], mutations: [] } })).not.toThrow();
    await settle();
  });

  it('treats a damaged entry as no entry', async () => {
    localStorage.setItem(PERSIST_STORAGE_KEY, '{not json');
    const reader = new QueryClient();
    await persistQueryClientRestore({ queryClient: reader, persister: createPersister(localStorage), buster: 'b', maxAge: 60_000 });
    expect(reader.getQueryCache().getAll()).toHaveLength(0);
  });
});

describe('PersistedCache', () => {
  it('paints the last answer straight away after a reload, then refetches', async () => {
    const writer = new QueryClient();
    await writer.prefetchQuery({ queryKey: queryKeys.errands.counts('user-1'), queryFn: async () => ({ open: 3 }), ...persistedQuery('live') });
    await createPersister(localStorage, 0).persistClient({
      timestamp: Date.now(),
      buster: cacheBuster('user-1'),
      clientState: dehydrate(writer, { shouldDehydrateQuery: (q) => shouldPersist({ queryKey: q.queryKey, state: q.state, meta: q.meta }) }),
    });
    await settle();

    const seen: Array<unknown> = [];
    let release: (value: { open: number }) => void = () => {};
    const slow = new Promise<{ open: number }>((resolve) => { release = resolve; });
    function Counts() {
      const query = useQuery({
        queryKey: queryKeys.errands.counts('user-1'),
        queryFn: () => slow,
        ...persistedQuery('live'),
        staleTime: 0,
      });
      seen.push(query.data);
      return null;
    }
    render(
      <QueryProvider>
        <PersistedCache userId="user-1"><Counts /></PersistedCache>
      </QueryProvider>,
    );

    await waitFor(() => expect(seen).toContainEqual({ open: 3 }));
    await act(async () => { release({ open: 4 }); });
    await waitFor(() => expect(seen.at(-1)).toEqual({ open: 4 }));
  });

  it('shows nothing from another person\'s cache', async () => {
    const writer = new QueryClient();
    await writer.prefetchQuery({ queryKey: queryKeys.errands.counts('user-1'), queryFn: async () => ({ open: 3 }), ...persistedQuery('live') });
    await createPersister(localStorage, 0).persistClient({
      timestamp: Date.now(),
      buster: cacheBuster('user-1'),
      clientState: dehydrate(writer, { shouldDehydrateQuery: (q) => shouldPersist({ queryKey: q.queryKey, state: q.state, meta: q.meta }) }),
    });
    await settle();

    const seen: Array<unknown> = [];
    function Counts() {
      const query = useQuery({ queryKey: queryKeys.errands.counts('user-1'), queryFn: async () => ({ open: 9 }), ...persistedQuery('live') });
      seen.push(query.data);
      return null;
    }
    render(
      <QueryProvider>
        <PersistedCache userId="user-2"><Counts /></PersistedCache>
      </QueryProvider>,
    );

    await waitFor(() => expect(seen).toContainEqual({ open: 9 }));
    expect(seen).not.toContainEqual({ open: 3 });
  });

  it('clears the in-memory and persisted caches on logout and account change', async () => {
    let client: QueryClient | undefined;
    function Probe() {
      client = useQueryClient();
      return null;
    }
    render(<QueryProvider><Probe /></QueryProvider>);
    client!.setQueryData(['errands', 'mine'], ['x']);
    localStorage.setItem(PERSIST_STORAGE_KEY, '{}');

    setCurrentSessionUserId('user-1');
    setCurrentSessionUserId('user-2');

    expect(client!.getQueryData(['errands', 'mine'])).toBeUndefined();
    expect(localStorage.getItem(PERSIST_STORAGE_KEY)).toBeNull();
  });
});

describe('server query hydration helpers', () => {
  it('prefetches data into a request-scoped client that can be dehydrated', async () => {
    const first = createServerQueryClient();
    const second = createServerQueryClient();
    await prefetchServerQuery(first, { queryKey: ['x'], queryFn: async () => 'a' });
    expect(first).not.toBe(second);
    expect(second.getQueryData(['x'])).toBeUndefined();
    expect(dehydrate(first).queries).toHaveLength(1);
  });
});

describe('domains', () => {
  it('expands one hop, and no further', () => {
    expect(expandDomains(['errands'])).toEqual(expect.arrayContaining(['errands', 'dashboard', 'marketplace', 'offers']));
    expect(expandDomains(['notifications'])).toEqual(['notifications']);
    expect(expandDomains(['reference'])).toEqual(['reference']);
  });

  it('maps realtime events to domains', () => {
    expect(domainsForEvent('offer.new')).toEqual(['offers']);
    expect(domainsForEvent('message.created')).toEqual(['conversations']);
    expect(domainsForEvent('unknown.thing')).toEqual([]);
  });
});

describe('useApiMutation()', () => {
  const wrap = (client: QueryClient) =>
    function Wrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };

  it('refreshes the declared domains and what is derived from them, and nothing else', async () => {
    const client = new QueryClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(
      () => useApiMutation({ mutationFn: async () => ({ ok: true }), affects: ['offers'] }),
      { wrapper: wrap(client) },
    );

    await act(async () => { await result.current.mutateAsync(); });

    const refreshed = spy.mock.calls.map(([filters]) => (filters as { queryKey: string[] }).queryKey[0]);
    expect(refreshed).toEqual(expect.arrayContaining(['offers', 'errands', 'dashboard']));
    expect(refreshed).not.toContain('billing');
  });

  it('refreshes after a failure too, so the screen converges on the server', async () => {
    const client = new QueryClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(
      () => useApiMutation({ mutationFn: async () => { throw new Error('nope'); }, affects: ['errands'] }),
      { wrapper: wrap(client) },
    );

    await act(async () => { await result.current.mutateAsync().catch(() => undefined); });

    expect(spy).toHaveBeenCalled();
  });
});
