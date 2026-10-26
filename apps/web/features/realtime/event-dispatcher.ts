import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { domainsForEvent, expandDomains, keyOf } from '@/lib/query/domains';

/** The query roots a realtime event refreshes: its domains and everything derived from them. */
export function queryKeysForRealtimeEvent(type: string): QueryKey[] {
  return expandDomains(domainsForEvent(type)).map((domain) => keyOf(domain));
}

export async function invalidateRealtimeEvent(client: QueryClient, type: string): Promise<void> {
  await Promise.all(
    queryKeysForRealtimeEvent(type).map((queryKey) => client.invalidateQueries({ queryKey })),
  );
}
