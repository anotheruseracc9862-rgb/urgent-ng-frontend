'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { MapProvider } from '@/components/map/MapProvider';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { offersApi } from '@/features/offers/api';
import { RoundedLiveLocationMap } from './rounded-live-location-map';

function freshnessCopy(freshness: string) {
  switch (freshness) {
    case 'FRESH': return 'Location is up to date.';
    case 'STALE': return 'Location may be out of date.';
    case 'EXPIRED': return 'The last location has expired.';
    default: return 'No location has been shared yet.';
  }
}

export function LiveTrackingPage({ assignmentId }: { assignmentId: string }) {
  const assignment = useQuery({
    queryKey: queryKeys.assignments.detail(assignmentId),
    queryFn: () => offersApi.assignment(assignmentId),
    retry: false,
  });
  const location = useQuery({
    queryKey: queryKeys.assignments.liveLocation(assignmentId),
    queryFn: () => offersApi.liveLocation(assignmentId),
    retry: false,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  if (assignment.isLoading || location.isLoading) {
    return <main className="mx-auto grid max-w-3xl gap-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 rounded-[var(--r-lg)]" /></main>;
  }
  if (assignment.error || !assignment.data || location.error || !location.data) {
    const error = assignment.error ?? location.error;
    const retry = () => { void assignment.refetch(); void location.refetch(); };
    return (
      <main className="mx-auto max-w-3xl">
        <Alert variant="danger" role="alert">
          <p>{isApiError(error) && error.code === 'RESOURCE_NOT_FOUND'
            ? 'This assignment could not be found, or you do not have permission to view it.'
            : 'We could not load live tracking.'}</p>
          {isApiError(error) && error.requestId ? <p className="mt-1 text-xs">Request ID: {error.requestId}</p> : null}
          <Button type="button" variant="ghost" className="mt-2" onClick={retry}>Try again</Button>
        </Alert>
      </main>
    );
  }

  const current = assignment.data.data;
  if (current.role !== 'REQUESTER') {
    return (
      <main className="mx-auto grid max-w-3xl gap-3">
        <Alert variant="warn" role="status">Live tracking is available to the requester on this assignment.</Alert>
        <Button asChild variant="ghost" className="w-fit"><Link href={`/assignments/${assignmentId}`}>Back to assignment</Link></Button>
      </main>
    );
  }

  const live = location.data;
  const hasPin = live.point !== null && live.sharing === 'ACTIVE' && ['FRESH', 'STALE'].includes(live.freshness);

  return (
    <main className="mx-auto grid max-w-3xl gap-4">
      <Link href={`/assignments/${assignmentId}`} className="w-fit text-sm font-bold text-green-800 hover:underline">← Back to assignment</Link>
      <header>
        <p className="text-xs font-extrabold uppercase tracking-wide text-green-800">Live tracking</p>
        <h1 className="mt-1 text-2xl font-extrabold text-ink sm:text-3xl">{current.errand.title}</h1>
        <p className="mt-2 text-sm text-muted">This map uses the rounded location shared by the runner. It does not show an exact address.</p>
      </header>
      <section className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
        <div>
          <h2 className="font-extrabold text-ink">Runner location</h2>
          <p role="status" className="mt-1 text-sm text-muted">{live.sharing === 'STOPPED' ? 'The runner stopped sharing location.' : freshnessCopy(live.freshness)}</p>
          {live.capturedAt ? <p className="mt-1 text-xs text-muted">Last update: <time dateTime={live.capturedAt}>{new Date(live.capturedAt).toLocaleString()}</time></p> : null}
          {live.estimatedArrivalMinutes !== null ? (
            <p className="mt-2 text-sm font-bold text-ink">Estimated arrival: {live.estimatedArrivalMinutes} minutes</p>
          ) : null}
        </div>
        {hasPin && live.point ? (
          <MapProvider><RoundedLiveLocationMap point={live.point} /></MapProvider>
        ) : (
          <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-line bg-panel p-5 text-center">
            <p className="max-w-sm text-sm text-muted">
              {live.sharing === 'STOPPED'
                ? 'No live pin is available while location sharing is stopped.'
                : live.freshness === 'EXPIRED'
                  ? 'The last location expired. A pin will appear after the runner shares a fresh position.'
                  : 'A live pin will appear after the runner shares a location.'}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
