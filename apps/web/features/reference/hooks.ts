'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';
import type { Category, PolicyVersion, ProhibitedItem } from '@/lib/api/types';
import { queryKeys } from '@/lib/query/keys';
import { isService } from './flow';

const REFERENCE_STALE_TIME = 60 * 60 * 1000;

export interface LocationRequirements {
  pickup: boolean;
  destination: boolean;
  /** Work done at one address: the destination is the service address and there is no item to move. */
  service: boolean;
}

export function requiredLocations(category: Pick<Category, 'requiresPickup' | 'requiresDestination'> & { flow?: Category['flow'] }): LocationRequirements {
  return {
    pickup: category.requiresPickup,
    destination: category.requiresDestination,
    service: isService(category),
  };
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.reference.categories(),
    queryFn: () => api<Category[]>('/reference/categories'),
    staleTime: REFERENCE_STALE_TIME,
  });
}

export function usePopularCategories() {
  return useQuery({
    queryKey: queryKeys.reference.popularCategories(),
    queryFn: () => api<Category[]>('/reference/popular-categories'),
    staleTime: REFERENCE_STALE_TIME,
  });
}

export function useProhibitedItems() {
  return useQuery({
    queryKey: queryKeys.reference.prohibitedItems(),
    queryFn: () => api<ProhibitedItem[]>('/reference/prohibited-items'),
    staleTime: REFERENCE_STALE_TIME,
  });
}

export function usePolicies() {
  return useQuery<PolicyVersion[]>({
    queryKey: queryKeys.reference.policies('all'),
    queryFn: authApi.policies,
    staleTime: REFERENCE_STALE_TIME,
  });
}
