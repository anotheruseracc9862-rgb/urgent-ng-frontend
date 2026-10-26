import { queryOptions } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { persistedQuery } from '@/lib/query/persisted-query';

export type DashboardSummary = components['schemas']['MeSummaryDto'];

export const dashboardQueries = {
  /** Counts and the latest activity for both dashboards. Counts only: safe to paint again after a reload. */
  summary: (userId: string) =>
    queryOptions({
      queryKey: queryKeys.dashboard.summary(userId),
      queryFn: ({ signal }) => api<DashboardSummary>('/me/summary', { signal }),
      ...persistedQuery('standard'),
    }),
};
