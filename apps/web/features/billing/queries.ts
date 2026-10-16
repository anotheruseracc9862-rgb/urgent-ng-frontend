import { queryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { liveQuery } from '@/lib/query/persisted-query';
import { billingApi } from './api';

export const billingQueries = {
  /** Prices change rarely and never need to survive a reload: billing is not persisted. */
  products: () =>
    queryOptions({
      queryKey: queryKeys.billing.products(),
      queryFn: () => billingApi.products(),
      ...liveQuery('slow'),
    }),
};
