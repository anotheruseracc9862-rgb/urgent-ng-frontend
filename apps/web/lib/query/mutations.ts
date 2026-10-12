import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { queryKeys } from './keys';

type InvalidationMap = {
  [K in keyof typeof queryKeys]?: Array<keyof (typeof queryKeys)[K]>;
};

// Helper to invalidate related queries after a mutation
export function useMutationWithInvalidation<TData, TError, TVariables, TContext = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  invalidations: InvalidationMap,
  options?: Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    ...options,
    onSuccess: (data, variables, context, mutationContext) => {
      // Invalidate specified query keys
      Object.entries(invalidations).forEach(([namespace, keys]) => {
        if (Array.isArray(keys)) {
          keys.forEach((key) => {
            const namespaceKeys = queryKeys[namespace as keyof typeof queryKeys];
            if (namespaceKeys && typeof namespaceKeys === 'object') {
              const queryKeyFn = namespaceKeys[key as keyof typeof namespaceKeys];
              if (typeof queryKeyFn === 'function') {
                queryClient.invalidateQueries({ queryKey: (queryKeyFn as () => readonly unknown[])() });
              }
            }
          });
        } else {
          // Invalidate entire namespace
          queryClient.invalidateQueries({ queryKey: [namespace] });
        }
      });

      options?.onSuccess?.(data, variables, context, mutationContext);
    },
  });
}

// Common mutation invalidations
export const invalidationMaps = {
  createErrand: {
    errands: ['lists', 'list'],
  },
  updateErrand: {
    errands: ['detail', 'lists'],
  },
  deleteErrand: {
    errands: ['lists', 'list'],
  },
  createOffer: {
    offers: ['lists', 'list'],
    runner: ['offerLimit'],
    errands: ['offers'],
  },
  updateOffer: {
    offers: ['detail', 'lists'],
    errands: ['offers'],
  },
  acceptOffer: {
    offers: ['detail'],
    errands: ['detail'],
    assignments: ['lists', 'list'],
  },
  updateAssignment: {
    assignments: ['detail', 'lists'],
    errands: ['detail'],
  },
  markNotificationRead: {
    notifications: ['list', 'unreadCount'],
  },
} as const;
