import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { queryKeys } from './keys';

export const invalidationMaps = {
  createErrand: [queryKeys.errands.all(), queryKeys.marketplace.all()],
  updateErrand: [queryKeys.errands.all()],
  deleteErrand: [queryKeys.errands.all(), queryKeys.marketplace.all()],
  createOffer: [queryKeys.offers.all(), queryKeys.runner.all(), queryKeys.errands.all()],
  updateOffer: [queryKeys.offers.all(), queryKeys.errands.all()],
  acceptOffer: [queryKeys.offers.all(), queryKeys.errands.all(), queryKeys.assignments.all()],
  updateAssignment: [queryKeys.assignments.all(), queryKeys.errands.all()],
  markNotificationRead: [queryKeys.notifications.all()],
} as const;

export type InvalidationName = keyof typeof invalidationMaps;

type ApiMutationOptions<TData, TError, TVariables, TContext> = Omit<
  UseMutationOptions<TData, TError, TVariables, TContext>,
  'mutationFn' | 'onSuccess'
> & {
  mutationFn: (variables: TVariables) => Promise<TData>;
  invalidates?: readonly InvalidationName[];
  onSuccess?: UseMutationOptions<TData, TError, TVariables, TContext>['onSuccess'];
};

export function useApiMutation<TData, TError = Error, TVariables = void, TContext = unknown>({
  mutationFn,
  invalidates = [],
  onSuccess,
  ...options
}: ApiMutationOptions<TData, TError, TVariables, TContext>) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn,
    onSuccess: async (data, variables, onMutateResult, mutationContext) => {
      await Promise.all(
        invalidates.flatMap((name) =>
          invalidationMaps[name].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
        ),
      );
      await onSuccess?.(data, variables, onMutateResult, mutationContext);
    },
  });
}
