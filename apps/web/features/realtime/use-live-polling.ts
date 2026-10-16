'use client';

import { useRealtimeStatus } from './realtime-provider';

/**
 * A `refetchInterval` that polls only while the live stream is not delivering events. With the
 * stream up, realtime events refresh the data, so polling would only add traffic.
 */
export function useLivePolling(ms: number): number | false {
  const status = useRealtimeStatus();
  return status === 'live' || status === 'connecting' ? false : ms;
}
