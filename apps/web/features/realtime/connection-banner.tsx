'use client';

import * as React from 'react';
import { Alert } from '@urgent/ui';
import { useRealtimeStatus } from './realtime-provider';

const BACK_ONLINE_MS = 4_000;

/**
 * Tells the user when the device is offline, and when it is back. A stream that is only retrying
 * (the device is online) stays silent: the app keeps working by refetching.
 */
export function ConnectionBanner() {
  const status = useRealtimeStatus();
  const [previous, setPrevious] = React.useState(status);
  const [down, setDown] = React.useState(false);
  const [recovered, setRecovered] = React.useState(false);

  // Adjust state while rendering (not in an effect) when the status changes.
  if (previous !== status) {
    setPrevious(status);
    if (status === 'offline') {
      setDown(true);
      setRecovered(false);
    } else if (status === 'live' && down) {
      setDown(false);
      setRecovered(true);
    }
  }

  React.useEffect(() => {
    if (!recovered) return;
    const timer = window.setTimeout(() => setRecovered(false), BACK_ONLINE_MS);
    return () => window.clearTimeout(timer);
  }, [recovered]);

  if (status === 'offline') {
    return (
      <Alert variant="warn" role="status">
        <p><strong>You are offline.</strong></p>
      </Alert>
    );
  }
  if (recovered) {
    return (
      <Alert variant="ok" role="status">
        <p><strong>Back online.</strong></p>
      </Alert>
    );
  }
  return null;
}
