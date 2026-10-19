'use client';

import { PageLoading } from '@/components/shell/page-loading';
import { PageHead } from '@/components/shell/page-head';
import { useLivePolling } from '@/features/realtime/use-live-polling';
import { useApiMutation } from '@/lib/query/mutations';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { offersApi, type AssignmentDetail } from '@/features/offers/api';
import { AssignmentPendingPage } from '@/features/offers/assignment/assignment-pending-page';
import { RouteBlock, stageBadge } from '../execution-progress';
import { AssignmentPhoto, AssignmentTimeline } from '../assignment-timeline';
import { JourneyHere } from '@/features/journey/journey-context';

type AssignedErrand = components['schemas']['AssignedErrandDto'];

function money(minor: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(minor / 100);
}

function label(value: string) {
  return value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function visibleLocation(location: AssignedErrand['pickup'], exact: boolean) {
  if (!location) return null;
  const keys = exact
    ? ['addressText', 'landmark', 'area', 'lga', 'state']
    : ['area', 'lga', 'state'];
  const display = keys
    .map((key) => location[key])
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
  return display.length ? [...new Set(display)].join(', ') : null;
}

function Contact({ title, contact }: { title: string; contact: AssignedErrand['pickupContact'] }) {
  if (!contact) return null;
  const details: Record<string, unknown> = contact;
  const name = typeof details.name === 'string' ? details.name : null;
  const phone = typeof details.phone === 'string' ? details.phone : null;
  if (!name && !phone) return null;
  return (
    <p className="text-sm text-ink-2">
      <span className="font-bold">{title}: </span>
      {name}{name && phone ? ' · ' : ''}{phone ? <a className="underline" href={`tel:${phone}`}>{phone}</a> : null}
    </p>
  );
}

export function AssignmentHubPage({ assignmentId }: { assignmentId: string }) {
  const polling = useLivePolling(30_000);
  const queryClient = useQueryClient();
  const [arrivalKey] = useState(() => crypto.randomUUID());
  const key = queryKeys.assignments.detail(assignmentId);
  const assignment = useQuery({
    queryKey: key,
    queryFn: () => offersApi.assignment(assignmentId),
    retry: false,
    refetchInterval: polling,
  });
  const timeline = useQuery({
    queryKey: queryKeys.assignments.timeline(assignmentId),
    queryFn: () => offersApi.assignmentTimeline(assignmentId),
    retry: false,
    enabled: Boolean(assignment.data),
    refetchInterval: polling,
  });
  const arrived = useApiMutation({ affects: ['assignments'],
    mutationFn: () => offersApi.arrived(assignmentId, {}, arrivalKey),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.assignments.timeline(assignmentId) });
    },
  });

  if (assignment.isPending) {
    return <PageLoading title="Assignment" eyebrow="Task" width="max-w-5xl" />;
  }
  if (assignment.error || !assignment.data) {
    return (
      <main className="min-w-0">
        <Alert variant="danger" role="alert">
          <p>{isApiError(assignment.error) && assignment.error.code === 'RESOURCE_NOT_FOUND'
            ? 'This assignment could not be found, or you do not have permission to view it.'
            : 'We could not load this assignment.'}</p>
          {isApiError(assignment.error) && assignment.error.requestId ? <p className="mt-1 text-xs">Request ID: {assignment.error.requestId}</p> : null}
          <Button type="button" variant="ghost" className="mt-2" onClick={() => void assignment.refetch()}>Try again</Button>
        </Alert>
      </main>
    );
  }

  const current: AssignmentDetail = assignment.data.data;
  const errand = current.errand;
  const exact = errand.accessLevel === 'EXACT';
  const isRunner = current.role === 'RUNNER';
  const hasArrived = timeline.data?.some((event) => event.type === 'ARRIVED');
  const badge = stageBadge(errand.status, current.status === 'PENDING_ACCEPTANCE');
  const canArrive = isRunner && current.status === 'ACCEPTED' && errand.status === 'IN_PROGRESS' && timeline.isSuccess && !hasArrived;

  return (
    <main className="grid min-w-0 content-start gap-4 pb-10">
      <Link href={isRunner ? '/assignments' : `/errands/${current.errandId}`} className="inline-flex w-fit items-center gap-2 text-xs font-bold text-green-900 hover:underline">
        <ArrowLeft aria-hidden="true" className="size-4" />{isRunner ? 'Active tasks' : 'Back to errand'}
      </Link>
      <PageHead
        eyebrow={`Assignment · ${isRunner ? 'Runner' : 'Requester'} view`}
        title={<span className="block max-w-[760px] break-words">{errand.title}</span>}
        description={`Payment is arranged directly with the ${isRunner ? 'requester' : 'runner'}. Urgent.ng never holds the money.`}
      />
      <JourneyHere />

      {current.status === 'PENDING_ACCEPTANCE' ? <AssignmentPendingPage assignmentId={assignmentId} embedded /> : null}

      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 content-start gap-4 lg:col-start-1 lg:row-start-1">
          <section className="grid gap-3 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
            <h2 className="text-base font-extrabold text-ink">Errand details</h2>
            <RouteBlock from={visibleLocation(errand.pickup, exact)} to={visibleLocation(errand.destination, exact)} />
            {!exact ? <p className="text-xs text-muted">Exact addresses and contacts are available to the requester and to the runner only while the assignment is accepted.</p> : null}
            <p className="whitespace-pre-wrap text-sm text-ink-2">{errand.description}</p>
            {errand.instructions ? <p className="whitespace-pre-wrap rounded-xl bg-panel p-3 text-sm text-ink-2">{errand.instructions}</p> : null}
            {exact ? <>
              <Contact title="Pickup contact" contact={errand.pickupContact} />
              <Contact title="Drop-off contact" contact={errand.dropoffContact} />
            </> : null}
            {errand.photos.length ? <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{errand.photos.map((photo, index) => typeof photo.mediaId === 'string' ? <AssignmentPhoto key={photo.mediaId} mediaId={photo.mediaId} alt={`Errand item ${index + 1}`} /> : null)}</div> : null}
          </section>
          {canArrive ? (
            <section className="grid gap-2 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
              <h2 className="font-extrabold text-ink">At the pickup location?</h2>
              <p className="text-sm text-muted">Optionally record your arrival once the errand has started.</p>
              <Button className="w-fit" type="button" disabled={arrived.isPending} onClick={() => arrived.mutate()}>
                {arrived.isPending ? 'Recording…' : 'I have arrived'}
              </Button>
              {arrived.error ? <ApiErrorAlert error={arrived.error} fallback="We could not record your arrival." /> : null}
            </section>
          ) : null}
          {timeline.error ? <ApiErrorAlert error={timeline.error} fallback="We could not load the assignment timeline." onRetry={() => void timeline.refetch()} /> : null}
          {timeline.isLoading ? <Skeleton className="h-40 rounded-[var(--r-lg)]" /> : null}
          {timeline.data ? <AssignmentTimeline events={timeline.data} /> : null}
        </div>

        <aside aria-label="Agreed fee and your actions" className="grid min-w-0 gap-4 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px] order-first lg:sticky lg:top-6 lg:order-none lg:col-start-2 lg:row-start-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold text-ink">Agreed fee</h2>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${badge.className}`}>
              <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />{badge.label}
            </span>
          </div>
          <div className="rounded-[var(--r)] bg-tint p-4">
            <p className="break-words text-[36px] font-extrabold leading-none tracking-tight tabular-nums text-ink">{money(current.agreedAmountMinor)}</p>
            <p className="mt-3 text-xs font-semibold text-green-900">{exact ? 'Exact details available' : 'Approximate details'}</p>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-line-2 pt-4" aria-label="Your actions">
          {isRunner && current.status === 'ACCEPTED' && ['ACCEPTED', 'IN_PROGRESS', 'PICKED_UP'].includes(errand.status) ? (
            <>
              <p className="w-full text-sm text-muted">Continue the errand and record each step as it happens.</p>
              <Button asChild className="w-full"><Link href={`/assignments/${assignmentId}/run`}>Continue errand</Link></Button>
              <Button asChild variant="ghost" size="sm"><Link href={`/assignments/${assignmentId}/problems`}>Problems, delays or receipt</Link></Button>
            </>
          ) : current.status === 'COMPLETED' ? (
            <p className="w-full text-sm text-muted">This errand is complete. Review the timeline for the recorded steps.</p>
          ) : current.status === 'CANCELLED' ? (
            <p className="w-full text-sm text-muted">This assignment was cancelled.</p>
          ) : errand.status === 'DISPUTED' ? (
            <p className="w-full text-sm text-muted">This errand is disputed. Automatic completion is paused while the team reviews it.</p>
          ) : (
            <p className="w-full text-sm text-muted">{current.status === 'PENDING_ACCEPTANCE' ? (isRunner ? 'Accept or decline this job above.' : 'Waiting for the runner to answer.') : `This assignment is ${label(current.status).toLowerCase()}.`}</p>
          )}
          {current.role === 'REQUESTER' && current.status === 'ACCEPTED' && ['ACCEPTED', 'IN_PROGRESS', 'PICKED_UP', 'DELIVERED'].includes(errand.status) ? (
            <Button asChild variant="ghost" size="sm"><Link href={`/assignments/${assignmentId}/track`}>Track runner</Link></Button>
          ) : null}
          {current.status === 'ACCEPTED' ? (
            <>
              <Button asChild variant="ghost" size="sm"><Link href={`/assignments/${assignmentId}/changes`}>Request a change</Link></Button>
              <Button asChild variant="ghost" size="sm"><Link href={`/assignments/${assignmentId}/payment`}>Payment agreement</Link></Button>
              <Button asChild variant="ghost" size="sm"><Link href={`/assignments/${assignmentId}/cancel`}>Cancel assignment</Link></Button>
              <Button asChild variant="ghost" size="sm"><Link href={`/assignments/${assignmentId}/no-show`}>No-show report</Link></Button>
            </>
          ) : null}
          {current.role === 'REQUESTER' && current.status === 'ACCEPTED' && errand.status === 'DELIVERED' ? (
            <Button asChild className="w-full"><Link href={`/assignments/${assignmentId}/confirm`}>Confirm delivery</Link></Button>
          ) : null}
          {current.status === 'COMPLETED' ? <Button asChild className="w-full"><Link href={`/assignments/${assignmentId}/rating`}>Rate this errand</Link></Button> : null}
          {current.disputeId ? <Button asChild variant="ghost" size="sm"><Link href={`/disputes/${current.disputeId}`}>View dispute</Link></Button> : null}
          {current.status === 'ACCEPTED' ? <>
            {errand.status !== 'DISPUTED' || !current.disputeId ? <Button asChild variant="ghost" size="sm"><Link href={`/assignments/${assignmentId}/dispute`}>{errand.status === 'DISPUTED' ? 'View dispute' : 'Open a dispute'}</Link></Button> : null}
            <Button asChild variant="ghost" size="sm"><Link href={`/errands/${current.errandId}/share`}>Share progress</Link></Button>
          </> : null}
          <Button asChild variant="ghost" size="sm"><Link href={`/safety?assignmentId=${assignmentId}`}>Safety & support</Link></Button>
          <p className="w-full border-t border-line pt-3 text-xs text-muted">Selected: {new Date(current.selectedAt).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })} (Lagos time)</p>
        </div>
        </aside>
      </div>
    </main>
  );
}

function ApiErrorAlert({ error, fallback, onRetry }: { error: unknown; fallback: string; onRetry?: () => void }) {
  return (
    <Alert variant="danger" role="alert">
      <p>{isApiError(error) ? error.message : fallback}</p>
      {isApiError(error) && error.requestId ? <p className="mt-1 text-xs">Request ID: {error.requestId}</p> : null}
      {onRetry ? <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={onRetry}>Try again</Button> : null}
    </Alert>
  );
}
