'use client';

import { useApiMutation } from '@/lib/query/mutations';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { isApiError } from '@/lib/api/client';
import { useLocationSharingConsent } from '@/features/settings/consent-state';
import { queryKeys } from '@/lib/query/keys';
import { offersApi } from '@/features/offers/api';
import { MIN_SEND_SECONDS, shouldSendLocation, type SentLocation } from './location-throttle';

export function RunnerLocationSharing({ assignmentId }: { assignmentId: string }) {
  const client = useQueryClient();
  const consent = useLocationSharingConsent();
  const supportsGeolocation = typeof navigator !== 'undefined' && Boolean(navigator.geolocation);
  const locationKey = queryKeys.assignments.liveLocation(assignmentId);
  const live = useQuery({
    queryKey: locationKey,
    queryFn: () => offersApi.liveLocation(assignmentId),
    retry: false,
  });
  const lastSent = useRef<SentLocation | null>(null);
  const backoffUntil = useRef(0);
  const watchId = useRef<number | null>(null);
  const consentStopAttempted = useRef(false);
  const [manualPause, setManualPause] = useState(false);
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const sharingMutation = useApiMutation({ affects: ['assignments'],
    mutationFn: (enabled: boolean) => offersApi.setLocationSharing(assignmentId, enabled),
    onSuccess: async (result) => {
      client.setQueryData(locationKey, (previous: Awaited<ReturnType<typeof offersApi.liveLocation>> | undefined) => previous
        ? { ...previous, sharing: result.enabled ? 'ACTIVE' : 'STOPPED' }
        : previous);
      if (result.enabled) {
        setManualPause(false);
        setLocationError(null);
        setLocationNotice('Location sharing is on. Updates pause when you leave this tab.');
      } else {
        setManualPause(true);
        setLocationNotice('Location sharing is stopped.');
      }
      await client.invalidateQueries({ queryKey: locationKey });
    },
    onError: (error, enabled) => {
      if (!enabled) setManualPause(false);
      if (isApiError(error) && error.code === 'LOCATION_PERMISSION_REQUIRED') {
        setLocationError('Location-sharing consent is required. Enable it in privacy settings before sharing.');
      }
    },
  });
  const locationMutation = useApiMutation({ affects: [],
    mutationFn: (position: GeolocationPosition) => offersApi.recordLocation(assignmentId, {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      ...(Number.isFinite(position.coords.accuracy) ? { accuracyMeters: position.coords.accuracy } : {}),
      capturedAt: new Date(position.timestamp).toISOString(),
    }),
    onSuccess: (result) => {
      setLocationNotice(result.recorded ? 'Your location was updated.' : 'Your location has not moved far enough for a new update.');
    },
    onError: (error) => {
      if (isApiError(error) && error.code === 'RATE_LIMITED') {
        // Not a fault: the server already has a recent position. Wait as long as it says (at least
        // one normal interval), keep sharing, and say so quietly instead of showing an error.
        const asked = error.details.retryAfterSeconds;
        const waitSeconds = Math.max(typeof asked === 'number' ? asked : 0, 30);
        backoffUntil.current = Date.now() + waitSeconds * 1000;
        setLocationError(null);
        setLocationNotice('Your location was shared a moment ago. The next update follows shortly.');
      } else if (isApiError(error) && error.code === 'LOCATION_PERMISSION_REQUIRED') {
        setLocationError('Location-sharing consent is required. Enable it in privacy settings before sharing.');
        setManualPause(true);
      } else {
        setLocationError(isApiError(error) ? error.message : 'We could not update your location.');
      }
    },
  });

  const serverSharing = live.data?.sharing === 'ACTIVE';
  const sharingEnabled = sharingMutation.data?.enabled ?? serverSharing;
  const setSharing = sharingMutation.mutate;
  const reportPosition = locationMutation.mutate;
  const sendPosition = useCallback((position: GeolocationPosition) => {
    const now = Date.now();
    const current = { lat: position.coords.latitude, lng: position.coords.longitude };
    if (now < backoffUntil.current || !shouldSendLocation(lastSent.current, current, now)) return;
    lastSent.current = { ...current, sentAt: now };
    reportPosition(position);
  }, [reportPosition]);

  useEffect(() => {
    const updateVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  // The server may already hold a position from a moment ago (the page was reloaded or reopened).
  // Do not send another until a normal interval has passed since that one, or it will refuse it.
  const lastKnownAge = live.data?.ageSeconds;
  useEffect(() => {
    if (typeof lastKnownAge === 'number' && lastKnownAge < MIN_SEND_SECONDS) {
      backoffUntil.current = Math.max(backoffUntil.current, Date.now() + (MIN_SEND_SECONDS - lastKnownAge) * 1000);
    }
  }, [lastKnownAge, live.dataUpdatedAt]);

  useEffect(() => {
    if (!sharingEnabled || !consent.isEnabled || hidden || manualPause) return;
    if (!navigator.geolocation) return;
    watchId.current = navigator.geolocation.watchPosition(
      sendPosition,
      (error) => {
        setLocationError(error.code === error.PERMISSION_DENIED
          ? 'Location permission was denied. You can continue the errand without sharing your location.'
          : 'We could not read your location. Check your device settings and try again.');
      },
      { enableHighAccuracy: false, maximumAge: 15_000, timeout: 20_000 },
    );
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    };
  }, [sharingEnabled, consent.isEnabled, hidden, manualPause, sendPosition]);

  useEffect(() => {
    if (consent.isEnabled) {
      consentStopAttempted.current = false;
    } else if (!consent.isLoading && sharingEnabled && !sharingMutation.isPending && !consentStopAttempted.current) {
      consentStopAttempted.current = true;
      setSharing(false);
    }
  }, [consent.isEnabled, consent.isLoading, sharingEnabled, sharingMutation.isPending, setSharing]);

  const startSharing = () => {
    setLocationError(null);
    setLocationNotice(null);
    if (!consent.isEnabled) {
      setLocationError('Location-sharing consent is required. Enable it in privacy settings before sharing.');
      return;
    }
    if (!navigator.geolocation) {
      setLocationError('This browser does not support location sharing. You can continue the errand without it.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => setSharing(true),
      (error) => setLocationError(error.code === error.PERMISSION_DENIED
        ? 'Location permission was denied. You can continue the errand without sharing your location.'
        : 'We could not read your location. Check your device settings and try again.'),
      { enableHighAccuracy: false, maximumAge: 0, timeout: 20_000 },
    );
  };
  const stopSharing = () => {
    setManualPause(true);
    setLocationError(null);
    sharingMutation.mutate(false);
  };

  if (consent.isLoading || live.isPending) {
    return <section className="grid gap-3 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]"><Skeleton className="h-5 w-44" /><Skeleton className="h-10 w-full" /></section>;
  }

  return (
    <section className="grid gap-3 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
      <div>
        <h2 className="font-extrabold text-ink">Live location</h2>
        <p className="mt-1 text-sm text-muted">
          {hidden && sharingEnabled
            ? 'Sharing is paused while this tab is hidden.'
            : sharingEnabled
              ? 'Sharing is on. Your location is sent no more than once every 30 seconds and only after 100 metres of movement.'
              : 'Sharing is stopped. The errand remains available without location sharing.'}
        </p>
        {live.data?.freshness === 'STALE' && live.data.capturedAt ? (
          <p className="mt-1 text-xs text-amber-900">Last shared location is stale; updated {new Date(live.data.capturedAt).toLocaleString()}.</p>
        ) : null}
      </div>
      {sharingEnabled && !supportsGeolocation ? (
        <Alert variant="warn" role="status">This browser does not support location sharing. You can continue the errand without it.</Alert>
      ) : null}
      {!consent.isEnabled ? (
        <Alert variant="warn" role="status">
          <p>Location-sharing consent is off. You can still complete the errand.</p>
          <Button asChild variant="ghost" size="sm" className="mt-2"><Link href="/settings/privacy">Review privacy settings</Link></Button>
        </Alert>
      ) : null}
      {locationError ? <Alert variant="danger" role="alert">{locationError}</Alert> : null}
      {locationNotice ? <Alert variant="ok" role="status">{locationNotice}</Alert> : null}
      {sharingMutation.error && !locationError ? (
        <Alert variant="danger" role="alert">
          <p>{isApiError(sharingMutation.error) ? sharingMutation.error.message : 'We could not change location sharing.'}</p>
          {isApiError(sharingMutation.error) && sharingMutation.error.requestId ? <p className="mt-1 text-xs">Request ID: {sharingMutation.error.requestId}</p> : null}
        </Alert>
      ) : null}
      {live.error ? (
        <Alert variant="danger" role="alert">
          <p>{isApiError(live.error) ? live.error.message : 'We could not load the location-sharing state.'}</p>
          {isApiError(live.error) && live.error.requestId ? <p className="mt-1 text-xs">Request ID: {live.error.requestId}</p> : null}
          <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => void live.refetch()}>Try again</Button>
        </Alert>
      ) : null}
      {sharingEnabled ? (
        <Button type="button" variant="ghost" className="w-fit" disabled={sharingMutation.isPending} onClick={stopSharing}>
          {sharingMutation.isPending ? 'Updating…' : 'Stop sharing'}
        </Button>
      ) : (
        <Button type="button" className="w-fit" disabled={!consent.isEnabled || sharingMutation.isPending || live.isError} onClick={startSharing}>
          {sharingMutation.isPending ? 'Updating…' : 'Start location sharing'}
        </Button>
      )}
    </section>
  );
}
