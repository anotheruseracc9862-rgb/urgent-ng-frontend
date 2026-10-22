'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { dashboardQueries } from '@/features/dashboard/queries';
import { useHydrated } from '@/lib/use-hydrated';
import { queryKeys } from '@/lib/query/keys';
import { messagingApi } from '@/features/messaging/api';
import { useNearbyErrands } from '@/features/marketplace/use-nearby-errands';
import type { NavCountKey, ShellMode } from './nav-items';

export type NavCounts = Partial<Record<NavCountKey, number>>;

/**
 * The numbers beside the rail items. They reuse the queries the dashboard, topbar and message
 * list already run, so the rail adds no requests of its own on those pages. Zero shows nothing.
 */
export function useNavCounts(mode: ShellMode, userId: string): NavCounts {
  const hydrated = useHydrated();

  const summary = useQuery(dashboardQueries.summary(userId));
  const unread = useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => api<{ count: number }>('/notifications/unread-count'),
    staleTime: 30_000,
  });
  const conversations = useQuery({
    queryKey: queryKeys.conversations.list({ filter: 'ALL', q: '' }),
    queryFn: () => messagingApi.conversations('ALL', ''),
    staleTime: 30_000,
  });

  const nearby = useNearbyErrands(userId, mode === 'RUNNER');

  // The server and the first client render show no counts, so the markup matches.
  if (!hydrated) return {};

  const counts: NavCounts = {
    notifications: unread.data?.count ?? 0,
    messages: (Array.isArray(conversations.data?.data) ? conversations.data.data : []).reduce((total, item) => total + item.unreadCount, 0),
  };
  if (mode === 'REQUESTER') {
    const requester = summary.data?.asRequester;
    counts.errands = requester ? requester.openErrands + requester.activeErrands : 0;
    counts.offersToReview = requester?.offersToReview ?? 0;
  } else {
    const runner = summary.data?.asRunner;
    counts.offers = runner?.activeOffers ?? 0;
    // Active assignments already include the ones waiting for the runner's answer.
    counts.tasks = runner ? runner.activeAssignments : 0;
    counts.nearby = nearby.total ?? 0;
  }
  return counts;
}
