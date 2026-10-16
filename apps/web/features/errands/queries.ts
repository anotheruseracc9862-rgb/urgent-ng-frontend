import { infiniteQueryOptions, keepPreviousData, queryOptions } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { api, apiResponse } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { liveQuery, persistedQuery } from '@/lib/query/persisted-query';
import type { ErrandSummary, MyErrandFilters } from './api';

export type MineCounts = components['schemas']['MineCountsDto'];

const LIST_LIMIT = 20;

/** Equal filters must give an equal key: drop empty values and keep a fixed order. */
function normalise(filters: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const name of Object.keys(filters).sort()) {
    const value = filters[name];
    if (value !== undefined && value !== null && value !== '') out[name] = value;
  }
  return out;
}

export const errandQueries = {
  /**
   * The requester's list. Rows carry only approximate areas, so the first view of each filter may
   * be painted again after a reload. Changing the filter keeps the old rows until the new ones land.
   */
  mine: (userId: string, filters: Pick<MyErrandFilters, 'tab' | 'sort' | 'q'>) =>
    infiniteQueryOptions({
      queryKey: queryKeys.errands.mine(userId, normalise(filters)),
      queryFn: ({ pageParam, signal }) =>
        apiResponse<ErrandSummary[]>('/errands/mine', {
          query: { tab: filters.tab, sort: filters.sort, q: filters.q || undefined, cursor: pageParam, limit: LIST_LIMIT },
          signal,
        }),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (page) => page.meta?.nextCursor ?? undefined,
      placeholderData: keepPreviousData,
      ...persistedQuery('standard'),
    }),

  counts: (userId: string) =>
    queryOptions({
      queryKey: queryKeys.errands.counts(userId),
      queryFn: ({ signal }) => api<MineCounts>('/errands/mine/counts', { signal }),
      ...persistedQuery('live'),
    }),

  /** Errands that have a runner. Carries assignment and conversation ids, so it is not persisted. */
  tracked: (userId: string) =>
    queryOptions({
      queryKey: queryKeys.errands.tracked(userId),
      queryFn: ({ signal }) =>
        apiResponse<ErrandSummary[]>('/errands/mine', { query: { tab: 'ACTIVE', sort: 'NEEDS_ATTENTION', limit: LIST_LIMIT }, signal }),
      ...liveQuery('live'),
    }),

  /** Open errands, most in need of attention first, for the dashboard card. */
  open: (userId: string) =>
    queryOptions({
      queryKey: queryKeys.errands.mine(userId, { tab: 'OPEN', sort: 'NEEDS_ATTENTION', limit: 5 }),
      queryFn: ({ signal }) =>
        api<ErrandSummary[]>('/errands/mine', { query: { tab: 'OPEN', sort: 'NEEDS_ATTENTION', limit: 5 }, signal }),
      ...persistedQuery('standard'),
    }),

  active: (userId: string) =>
    queryOptions({
      queryKey: queryKeys.errands.mine(userId, { tab: 'ACTIVE', limit: 5 }),
      queryFn: ({ signal }) => api<ErrandSummary[]>('/errands/mine', { query: { tab: 'ACTIVE', limit: 5 }, signal }),
      ...persistedQuery('standard'),
    }),
};
