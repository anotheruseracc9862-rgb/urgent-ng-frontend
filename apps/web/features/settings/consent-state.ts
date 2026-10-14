'use client';

import { useQuery } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { authApi } from '@/lib/api/auth';
import { useSession } from '@/lib/auth/client';
import { queryKeys } from '@/lib/query/keys';

type ConsentView = components['schemas']['ConsentViewDto'];
type ConsentType = components['schemas']['ConsentType'];

export function latestConsentFor(consents: ConsentView[], type: ConsentType): ConsentView | undefined {
  return consents
    .filter((consent) => consent.type === type)
    .sort((left, right) => Date.parse(right.acceptedAt) - Date.parse(left.acceptedAt))[0];
}

export function hasActiveConsent(consents: ConsentView[], type: ConsentType): boolean {
  return latestConsentFor(consents, type)?.withdrawnAt === null;
}

export function useConsentHistory(userId: string) {
  return useQuery({
    queryKey: queryKeys.consents.history(userId),
    queryFn: authApi.consents,
    staleTime: 30_000,
  });
}

export function useLocationSharingConsent() {
  const { me } = useSession();
  const history = useConsentHistory(me.id);

  return {
    ...history,
    isEnabled: history.data ? hasActiveConsent(history.data.consents, 'LOCATION_SHARING') : false,
  };
}
