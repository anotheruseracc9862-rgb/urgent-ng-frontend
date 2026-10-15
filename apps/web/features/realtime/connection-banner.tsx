'use client';

import * as React from 'react';
import { Alert } from '@urgent/ui';
import { useRealtimeStatus } from './realtime-provider';

const BACK_ONLINE_MS = 4_000;

/** Tells the user when live updates are paused. The app keeps working by refetching. */
export function ConnectionBanner() {
  const status = useRealtimeStatus();
  const [previous, setPrevious] = React.useState(status);
  const [down, setDown] = React.useState(false);
  const [recovered, setRecovered] = React.useState(false);

  // Adjust state while rendering (not in an effect) when the status changes.
  if (previous !== status) {
    setPrevious(status);
    if (status === 'offline' || status === 'degraded') {
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
        <p><strong>You are offline.</strong> Updates will resume when your connection returns.</p>
      </Alert>
    );
  }
  if (status === 'degraded') {
    return (
      <Alert variant="warn" role="status">
        <p><strong>Reconnecting…</strong> Live offers, messages and progress updates will resume. Pages still refresh on their own.</p>
      </Alert>
    );
  }
  if (recovered) {
    return (
      <Alert variant="ok" role="status">
        <p><strong>Back online.</strong> You are up to date.</p>
      </Alert>
    );
  }
  return null;
}
