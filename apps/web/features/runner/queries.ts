import { queryOptions } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { liveQuery, persistedQuery } from '@/lib/query/persisted-query';

export type RunnerProfile = components['schemas']['RunnerProfileDto'];
export type RunnerEligibility = components['schemas']['RunnerEligibilityDto'];
export type RunnerOfferLimit = components['schemas']['RunnerOfferLimitDto'];
export type RunnerPerformance = components['schemas']['RunnerPerformanceDto'];

export const runnerQueries = {
  /** Holds the operating-area centre, so it is not written to storage. */
  profile: (userId: string) =>
    queryOptions({
      queryKey: queryKeys.runner.profileFor(userId),
      queryFn: ({ signal }) => api<RunnerProfile>('/runner/profile', { signal }),
      retry: false,
      ...liveQuery('slow'),
    }),

  eligibility: (userId: string) =>
    queryOptions({
      queryKey: queryKeys.runner.eligibilityFor(userId),
      queryFn: ({ signal }) => api<RunnerEligibility>('/runner/eligibility', { signal }),
      retry: false,
      ...liveQuery('standard'),
    }),

  offerLimit: (userId: string) =>
    queryOptions({
      queryKey: queryKeys.runner.offerLimitFor(userId),
      queryFn: ({ signal }) => api<RunnerOfferLimit>('/runner/offer-limit', { signal }),
      ...persistedQuery('live'),
    }),

  performance: (userId: string) =>
    queryOptions({
      queryKey: queryKeys.runner.performanceFor(userId),
      queryFn: ({ signal }) => api<RunnerPerformance>('/runner/performance', { signal }),
      retry: false,
      ...persistedQuery('slow'),
    }),
};
