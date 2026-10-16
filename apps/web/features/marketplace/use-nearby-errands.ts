'use client';

import { useQuery } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { apiResponse } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { persistedQuery } from '@/lib/query/persisted-query';
import { runnerQueries } from '@/features/runner/queries';

type FeedItem = components['schemas']['FeedItemDto'];

export const NEARBY_FEED_FILTERS = { sort: 'recommended', limit: 5 } as const;

export function nearbyFeedKey(userId: string) {
  return queryKeys.marketplace.nearby(userId);
}

/** Whether this runner may browse the feed. Shared by the dashboard and the navigation rail. */
export function useRunnerEligibility(userId: string, enabled = true) {
  return useQuery({ ...runnerQueries.eligibility(userId), enabled });
}

/**
 * The first page of nearby errands with the size of the whole result (`meta.total`). One query
 * feeds the dashboard list, its "See all 42" link and the count beside "Find errands".
 */
export function useNearbyErrands(userId: string, enabled: boolean) {
  const eligibility = useRunnerEligibility(userId, enabled);
  const feed = useQuery({
    queryKey: nearbyFeedKey(userId),
    queryFn: ({ signal }) => apiResponse<FeedItem[]>('/marketplace/errands', { query: NEARBY_FEED_FILTERS, signal }),
    enabled: enabled && eligibility.data?.canBrowseFeed === true,
    // Approximate areas only, so the last first page may be shown again after a reload.
    ...persistedQuery('standard'),
  });
  const total = typeof feed.data?.meta?.total === 'number' ? feed.data.meta.total : null;
  return { eligibility, feed, items: feed.data?.data ?? [], total };
}
