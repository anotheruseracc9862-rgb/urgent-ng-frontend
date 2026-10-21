'use client';

import { PageLoading } from '@/components/shell/page-loading';
import { PageHead } from '@/components/shell/page-head';
import { ArrowLeft } from 'lucide-react';
import { useLivePolling } from '@/features/realtime/use-live-polling';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { MapProvider } from '@/components/map/MapProvider';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { offersApi } from '@/features/offers/api';
import { JourneyHere } from '@/features/journey/journey-context';
import { isService } from '@/features/reference/flow';

// The map code loads only when there is a pin to show.
const RoundedLiveLocationMap = dynamic(
  () => import('@/features/location/track/rounded-live-location-map').then((module) => module.RoundedLiveLocationMap),
  { ssr: false, loading: () => <Skeleton className="h-64 rounded-[var(--r)]" aria-label="Loading map" /> },
);

function freshnessCopy(freshness: string) {
  switch (freshness) {
    case 'FRESH': return 'Location is up to date.';
    case 'STALE': return 'Location may be out of date.';
    case 'EXPIRED': return 'The last location has expired.';
    default: return 'No location has been shared yet.';
  }
}

export function LiveTrackingPage({ assignmentId }: { assignmentId: string }) {
  const polling = useLivePolling(30_000);
  const assignment = useQuery({
    queryKey: queryKeys.assignments.detail(assignmentId),
    queryFn: () => offersApi.assignment(assignmentId),
    retry: false,
  });
  // A service happens at one address: there is no runner to follow, and the server has no location for it.
  const service = isService(assignment.data?.data.errand.category);
  const location = useQuery({
    queryKey: queryKeys.assignments.liveLocation(assignmentId),
    queryFn: () => offersApi.liveLocation(assignmentId),
    retry: false,
    refetchInterval: polling,
    refetchIntervalInBackground: false,
    enabled: assignment.data !== undefined && !service,
  });

  if (assignment.isPending || (!service && location.isPending && !assignment.error)) {
    return <PageLoading title="Live tracking" eyebrow="Requester" width="max-w-5xl" />;
  }
  if (service) {
    return (
      <main className="grid min-w-0 content-start gap-4 pb-10">
        <PageHead eyebrow="Live tracking" title="Nothing to follow" description="This job happens at one address, so there is no route to track." />
        <Alert variant="info" role="status">Open the assignment to see where the work has got to. Messages with the runner stay open.</Alert>
        <Button asChild variant="ghost" className="w-fit"><Link href={`/assignments/${assignmentId}`}>Back to assignment</Link></Button>
      </main>
    );
  }
  if (assignment.error || !assignment.data || location.error || !location.data) {
    const error = assignment.error ?? location.error;
    const retry = () => { void assignment.refetch(); void location.refetch(); };
    return (
      <main className="grid min-w-0 content-start gap-4 pb-10">
        <Alert variant="danger" role="alert">
          <p>{isApiError(error) && error.code === 'RESOURCE_NOT_FOUND'
            ? 'This assignment could not be found, or you do not have permission to view it.'
            : 'We could not load live tracking.'}</p>
          <Button type="button" variant="ghost" className="mt-2" onClick={retry}>Try again</Button>
        </Alert>
      </main>
    );
  }

  const current = assignment.data.data;
  if (current.role !== 'REQUESTER') {
    return (
      <main className="grid min-w-0 content-start gap-4 pb-10">
        <Alert variant="warn" role="status">Live tracking is available to the requester on this assignment.</Alert>
        <Button asChild variant="ghost" className="w-fit"><Link href={`/assignments/${assignmentId}`}>Back to assignment</Link></Button>
      </main>
    );
  }

  const live = location.data;
  const hasPin = live.point !== null && live.sharing === 'ACTIVE' && ['FRESH', 'STALE'].includes(live.freshness);

  return (
    <main className="grid min-w-0 content-start gap-4 pb-10">
      <Link href={`/assignments/${assignmentId}`} className="inline-flex w-fit items-center gap-2 text-xs font-bold text-green-900 hover:underline max-sm:hidden"><ArrowLeft aria-hidden="true" className="size-4" />Back to assignment</Link>
      <PageHead
        eyebrow="Live tracking"
        title={<span className="block max-w-[760px] break-words">{current.errand.title}</span>}
        description="This map uses the rounded location shared by the runner. It does not show an exact address."
      />
      <JourneyHere />
      <section className="grid min-w-0 gap-3 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
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
