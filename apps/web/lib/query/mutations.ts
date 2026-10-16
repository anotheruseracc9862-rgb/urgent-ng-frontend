import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { refreshDomains } from './client';
import type { Domain } from './domains';

type ApiMutationOptions<TData, TError, TVariables, TContext> = Omit<
  UseMutationOptions<TData, TError, TVariables, TContext>,
  'onSettled' | 'meta'
> & {
  /**
   * Every domain this write changes. Required: a write that changes nothing the app shows says
   * so with `affects: []`. The domains and everything derived from them refresh after the write
   * settles (also on failure, so the screen converges on the server), and other tabs are told.
   */
  affects: readonly Domain[];
  onSettled?: UseMutationOptions<TData, TError, TVariables, TContext>['onSettled'];
};

/**
 * The way to write in this app. It replaces a bare `useMutation` so that no write can leave a
 * screen showing the old state. See `lib/query/domains.ts` for what each domain refreshes.
 */
export function useApiMutation<TData, TError = Error, TVariables = void, TContext = unknown>({
  affects,
  onSettled,
  ...options
}: ApiMutationOptions<TData, TError, TVariables, TContext>) {
  const queryClient = useQueryClient();

  return useMutation<TData, TError, TVariables, TContext>({
    ...options,
    meta: { affects },
    onSettled: async (data, error, variables, onMutateResult, mutationContext) => {
      if (affects.length > 0) await refreshDomains(queryClient, affects);
      await onSettled?.(data, error, variables, onMutateResult, mutationContext);
    },
  });
}
