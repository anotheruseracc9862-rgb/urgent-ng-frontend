'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { api, isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { offersApi, type AssignmentDetail, type ExecutionEvent } from '@/features/offers/api';
import { AssignmentPendingPage } from '@/features/offers/assignment/assignment-pending-page';

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

function AssignmentPhoto({ mediaId, alt }: { mediaId: string; alt: string }) {
  const image = useQuery({
    queryKey: queryKeys.media.url(mediaId),
    queryFn: () => api<components['schemas']['MediaUrlDto']>(`/media/${mediaId}/url`),
    staleTime: 4 * 60_000,
    retry: false,
  });
  if (image.error) {
    return <ApiErrorAlert error={image.error} fallback="We could not load this photo." onRetry={() => void image.refetch()} />;
  }
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl bg-panel">
      {image.data?.url ? <a href={image.data.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${alt.toLowerCase()}`}><Image src={image.data.url} alt={alt} fill unoptimized sizes="(max-width: 768px) 40vw, 200px" className="object-contain" /></a> : <Skeleton className="size-full" aria-label="Loading photo" />}
    </div>
  );
}

export function AssignmentHubPage({ assignmentId }: { assignmentId: string }) {
  const queryClient = useQueryClient();
  const [arrivalKey] = useState(() => crypto.randomUUID());
  const key = queryKeys.assignments.detail(assignmentId);
  const assignment = useQuery({
    queryKey: key,
    queryFn: () => offersApi.assignment(assignmentId),
    retry: false,
    refetchInterval: 30_000,
  });
  const timeline = useQuery({
    queryKey: queryKeys.assignments.timeline(assignmentId),
    queryFn: () => offersApi.assignmentTimeline(assignmentId),
    retry: false,
    enabled: Boolean(assignment.data),
    refetchInterval: 30_000,
  });
  const arrived = useMutation({
    mutationFn: () => offersApi.arrived(assignmentId, {}, arrivalKey),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.assignments.timeline(assignmentId) });
    },
  });

  if (assignment.isLoading) {
    return <main className="mx-auto grid max-w-5xl gap-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-48 rounded-[var(--r-lg)]" /><Skeleton className="h-64 rounded-[var(--r-lg)]" /></main>;
  }
  if (assignment.error || !assignment.data) {
    return (
      <main className="mx-auto max-w-5xl">
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
  const canArrive = isRunner && current.status === 'ACCEPTED' && errand.status === 'IN_PROGRESS' && timeline.isSuccess && !hasArrived;

  return (
    <main className="mx-auto grid max-w-5xl gap-4">
      <Link href="/dashboard" className="w-fit text-sm font-bold text-green-800 hover:underline">← Dashboard</Link>
      <header className="rounded-[var(--r-lg)] border border-line bg-tint p-4 shadow-[var(--shadow)] sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-green-bg px-3 py-1 text-xs font-bold text-green-900">{label(errand.status)}</span>
          <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-muted">{label(current.role)}</span>
          <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-muted">{exact ? 'Exact details available' : 'Approximate details'}</span>
        </div>
        <h1 className="mt-3 text-2xl font-extrabold text-ink sm:text-3xl">{errand.title}</h1>
        <p className="mt-2 text-sm text-muted">Agreed runner fee: <strong className="text-ink">{money(current.agreedAmountMinor)}</strong>. This is an agreement between the parties; Urgent.ng does not hold the money.</p>
      </header>

      {current.status === 'PENDING_ACCEPTANCE' ? <AssignmentPendingPage assignmentId={assignmentId} embedded /> : null}

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid content-start gap-4">
          <section className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
            <h2 className="font-extrabold text-ink">Errand details</h2>
            <p className="whitespace-pre-wrap text-sm text-ink-2">{errand.description}</p>
            {errand.instructions ? <p className="whitespace-pre-wrap rounded-xl bg-panel p-3 text-sm text-ink-2">{errand.instructions}</p> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Location label="Pickup" value={visibleLocation(errand.pickup, exact)} />
              <Location label="Destination" value={visibleLocation(errand.destination, exact)} />
            </div>
            {!exact ? <p className="text-xs text-muted">Exact addresses and contacts are available to the requester and to the runner only while the assignment is accepted.</p> : null}
            {exact ? <>
              <Contact title="Pickup contact" contact={errand.pickupContact} />
              <Contact title="Drop-off contact" contact={errand.dropoffContact} />
            </> : null}
            {errand.photos.length ? <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{errand.photos.map((photo, index) => typeof photo.mediaId === 'string' ? <AssignmentPhoto key={photo.mediaId} mediaId={photo.mediaId} alt={`Errand item ${index + 1}`} /> : null)}</div> : null}
          </section>
          {canArrive ? (
            <section className="grid gap-2 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
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
          {timeline.data ? <Timeline events={timeline.data} /> : null}
        </div>

        <aside className="grid content-start gap-3 self-start rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
          <h2 className="font-extrabold text-ink">Next action</h2>
          {isRunner && current.status === 'ACCEPTED' && ['ACCEPTED', 'IN_PROGRESS', 'PICKED_UP'].includes(errand.status) ? (
            <>
              <p className="text-sm text-muted">Continue the errand and record each step as it happens.</p>
              <Button asChild><Link href={`/assignments/${assignmentId}/run`}>Continue errand</Link></Button>
              <Button asChild variant="ghost"><Link href={`/assignments/${assignmentId}/problems`}>Problems, delays or receipt</Link></Button>
            </>
          ) : current.status === 'COMPLETED' ? (
            <p className="text-sm text-muted">This errand is complete. Review the timeline for the recorded steps.</p>
          ) : current.status === 'CANCELLED' ? (
            <p className="text-sm text-muted">This assignment was cancelled.</p>
          ) : errand.status === 'DISPUTED' ? (
            <p className="text-sm text-muted">This errand is disputed. Automatic completion is paused while the team reviews it.</p>
          ) : (
            <p className="text-sm text-muted">The assignment status is {label(current.status)}. Review the details and timeline for updates.</p>
          )}
          {current.role === 'REQUESTER' && current.status === 'ACCEPTED' && ['ACCEPTED', 'IN_PROGRESS', 'PICKED_UP', 'DELIVERED'].includes(errand.status) ? (
            <Button asChild variant="ghost"><Link href={`/assignments/${assignmentId}/track`}>Track runner</Link></Button>
          ) : null}
          {current.status === 'ACCEPTED' ? (
            <>
              <Button asChild variant="ghost"><Link href={`/assignments/${assignmentId}/changes`}>Request a change</Link></Button>
              <Button asChild variant="ghost"><Link href={`/assignments/${assignmentId}/payment`}>Payment agreement</Link></Button>
              <Button asChild variant="ghost"><Link href={`/assignments/${assignmentId}/cancel`}>Cancel assignment</Link></Button>
              <Button asChild variant="ghost"><Link href={`/assignments/${assignmentId}/no-show`}>No-show report</Link></Button>
            </>
          ) : null}
          {current.role === 'REQUESTER' && current.status === 'ACCEPTED' && errand.status === 'DELIVERED' ? (
            <Button asChild><Link href={`/assignments/${assignmentId}/confirm`}>Confirm delivery</Link></Button>
          ) : null}
          {current.status === 'COMPLETED' ? <Button asChild><Link href={`/assignments/${assignmentId}/rating`}>Rate this errand</Link></Button> : null}
          {current.disputeId ? <Button asChild variant="ghost"><Link href={`/disputes/${current.disputeId}`}>View dispute</Link></Button> : null}
          {current.status === 'ACCEPTED' ? <>
            {errand.status !== 'DISPUTED' || !current.disputeId ? <Button asChild variant="ghost"><Link href={`/assignments/${assignmentId}/dispute`}>{errand.status === 'DISPUTED' ? 'View dispute' : 'Open a dispute'}</Link></Button> : null}
            <Button asChild variant="ghost"><Link href={`/errands/${current.errandId}/share`}>Share progress</Link></Button>
          </> : null}
          <Button asChild variant="ghost"><Link href={`/safety?assignmentId=${assignmentId}`}>Safety & support</Link></Button>
          <p className="border-t border-line pt-3 text-xs text-muted">Selected: {new Date(current.selectedAt).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })} (Lagos time)</p>
        </aside>
      </div>
    </main>
  );
}

function Location({ label: title, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-xl bg-panel p-3">
      <p className="text-xs font-extrabold uppercase tracking-wide text-muted">{title}</p>
      <p className="mt-1 text-sm font-bold text-ink">{value ?? 'Not provided'}</p>
    </div>
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

function Timeline({ events }: { events: ExecutionEvent[] }) {
  return (
    <section className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
      <h2 className="font-extrabold text-ink">Timeline</h2>
      {events.length ? (
        <ol className="grid gap-3">
          {events.map((event) => <li key={event.id} className="border-l-2 border-lime-600 pl-3">
            <p className="font-bold text-ink">{label(event.type)}</p>
            {event.note ? <p className="text-sm text-ink-2">{event.note}</p> : null}
            {event.mediaId ? <div className="my-2 max-w-48"><AssignmentPhoto mediaId={event.mediaId} alt={`${label(event.type)} evidence`} /></div> : null}
            <time className="text-xs text-muted" dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })} (Lagos time)</time>
          </li>)}
        </ol>
      ) : <p className="text-sm text-muted">No timeline events yet.</p>}
    </section>
  );
}
