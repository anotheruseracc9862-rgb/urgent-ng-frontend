'use client';

import { PageLoading } from '@/components/shell/page-loading';
import { PageHead } from '@/components/shell/page-head';
import { useLivePolling } from '@/features/realtime/use-live-polling';
import { useApiMutation } from '@/lib/query/mutations';
import Link from 'next/link';
import { ArrowLeft, Flag, HandCoins, MapPin, MessageSquare, Scale, Share2, ShieldCheck, UserX, Wallet, X } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { offersApi, type AssignmentDetail } from '@/features/offers/api';
import { AssignmentPendingPage } from '@/features/offers/assignment/assignment-pending-page';
import { RouteBlock, stageBadge } from '../execution-progress';
import { PLACE_COPY, flowOf } from '@/features/reference/flow';
import { AssignmentPhoto, AssignmentTimeline } from '../assignment-timeline';
import { availableActions } from '../available-actions';
import { paymentPrompt } from '../payment/payment-prompt';
import { ActionRow } from '../action-row';
import { JourneyHere } from '@/features/journey/journey-context';
import { useRatingAction } from '@/features/ratings/use-rating-action';

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
  const ratingAction = useRatingAction(assignmentId, assignment.data?.data.status === 'COMPLETED');
  const timeline = useQuery({
    queryKey: queryKeys.assignments.timeline(assignmentId),
    queryFn: () => offersApi.assignmentTimeline(assignmentId),
    retry: false,
    enabled: Boolean(assignment.data),
    refetchInterval: polling,
  });
  const wantsPayment = assignment.data ? availableActions(assignment.data.data.role, assignment.data.data.status, assignment.data.data.errand.status).paymentTerms : false;
  const payment = useQuery({
    queryKey: queryKeys.assignments.paymentAgreement(assignmentId),
    queryFn: () => offersApi.paymentAgreement(assignmentId),
    retry: false,
    enabled: wantsPayment,
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
  const flow = flowOf(errand.category);
  const service = flow === 'SERVICE';
  const badge = stageBadge(errand.status, current.status === 'PENDING_ACCEPTANCE', flow);
  const can = availableActions(current.role, current.status, errand.status);
  const canArrive = isRunner && current.status === 'ACCEPTED' && errand.status === 'IN_PROGRESS' && timeline.isSuccess && !hasArrived;
  const notStarted = errand.status === 'ACCEPTED';
  const prompt = paymentPrompt(current.role, payment.data);

  return (
    <main className="grid min-w-0 content-start gap-4 pb-10">
      <Link href={isRunner ? '/assignments' : '/track'} className="inline-flex w-fit items-center gap-2 text-xs font-bold text-green-900 hover:underline max-sm:hidden">
        <ArrowLeft aria-hidden="true" className="size-4" />{isRunner ? 'Active tasks' : 'Track errands'}
      </Link>
      <PageHead
        eyebrow={`Assignment · ${isRunner ? 'Runner' : 'Requester'} view`}
        title={<span className="block max-w-[760px] break-words">{errand.title}</span>}
        description={`Payment is arranged directly with the ${isRunner ? 'requester' : 'runner'}. Urgent.ng never holds the money.`}
      />
      <JourneyHere />

      {can.paymentTerms && prompt.needsAction && prompt.message ? (
        <section aria-label="Payment agreement" className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-lg)] bg-tint p-4 sm:px-[22px]">
          <div className="flex min-w-0 items-start gap-3">
            <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-green-900"><HandCoins className="size-[18px]" /></span>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-ink">{prompt.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-green-900">{prompt.message}</p>
            </div>
          </div>
          <Button asChild size="sm"><Link href={`/assignments/${assignmentId}/payment`}>{prompt.step === 'SET_TERMS' ? 'Set payment terms' : 'Review and confirm'}</Link></Button>
        </section>
      ) : null}

      {current.status === 'PENDING_ACCEPTANCE' ? <AssignmentPendingPage assignmentId={assignmentId} embedded /> : null}

      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 content-start gap-4 lg:col-start-1 lg:row-start-1">
          <section className="grid gap-3 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
            <h2 className="text-base font-extrabold text-ink">Errand details</h2>
            <RouteBlock flow={flow} from={visibleLocation(errand.pickup, exact)} to={visibleLocation(errand.destination, exact)} />
            {!exact ? <p className="text-xs text-muted">Exact addresses and contacts are available to the requester and to the runner only while the assignment is accepted.</p> : null}
            <p className="whitespace-pre-wrap text-sm text-ink-2">{errand.description}</p>
            {errand.instructions ? <p className="whitespace-pre-wrap rounded-xl bg-panel p-3 text-sm text-ink-2">{errand.instructions}</p> : null}
            {exact ? <>
              {service ? null : <Contact title="Pickup contact" contact={errand.pickupContact} />}
              <Contact title={PLACE_COPY[flow].contact} contact={errand.dropoffContact} />
            </> : null}
            {errand.photos.length ? <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{errand.photos.map((photo, index) => typeof photo.mediaId === 'string' ? <AssignmentPhoto key={photo.mediaId} mediaId={photo.mediaId} alt={`Errand item ${index + 1}`} /> : null)}</div> : null}
          </section>
          {canArrive ? (
            <section className="grid gap-2 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
              <h2 className="font-extrabold text-ink">{service ? 'At the address?' : 'At the pickup location?'}</h2>
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
          {can.continueErrand ? (
            <>
              <p className="w-full text-sm text-muted">{notStarted ? 'Open the errand to start it and record each step as it happens.' : 'Continue the errand and record each step as it happens.'}</p>
              <Button asChild className="w-full"><Link href={`/assignments/${assignmentId}/run`}>{notStarted ? 'Run errand' : 'Continue errand'}</Link></Button>
            </>
          ) : can.confirmDelivery ? (
            <>
              <p className="w-full text-sm text-muted">{service ? 'The runner marked the work finished. Confirm it is done, or open a dispute.' : 'The runner marked this delivered. Confirm it is done, or open a dispute.'}</p>
              <Button asChild className="w-full"><Link href={`/assignments/${assignmentId}/confirm`}>{service ? 'Confirm work done' : 'Confirm delivery'}</Link></Button>
            </>
          ) : can.rate ? (
            <>
              <p className="w-full text-sm text-muted">{ratingAction.note}</p>
              {ratingAction.label ? <Button asChild className="w-full" variant={ratingAction.label === 'Rate this errand' ? 'primary' : 'ghost'}><Link href={`/assignments/${assignmentId}/rating`}>{ratingAction.label}</Link></Button> : null}
            </>
          ) : current.status === 'CANCELLED' ? (
            <p className="w-full text-sm text-muted">This assignment was cancelled.</p>
          ) : errand.status === 'DISPUTED' ? (
            <p className="w-full text-sm text-muted">This errand is disputed. Automatic completion is paused while the team reviews it.</p>
          ) : current.status === 'PENDING_ACCEPTANCE' ? (
            <p className="w-full text-sm text-muted">{isRunner ? 'Accept or decline this job above.' : 'Waiting for the runner to answer.'}</p>
          ) : errand.status === 'DELIVERED' ? (
            <p className="w-full text-sm text-muted">{service ? 'Finished. Waiting for the requester to confirm.' : 'Delivered. Waiting for the requester to confirm.'}</p>
          ) : (
            <p className="w-full text-sm text-muted">This assignment is {label(current.status).toLowerCase()}.</p>
          )}
          <nav aria-label="More actions" className="grid w-full gap-2">
            {can.trackRunner ? <ActionRow href={`/assignments/${assignmentId}/track`} icon={MapPin}>Track runner</ActionRow> : null}
            {can.reportProblems ? <ActionRow href={`/assignments/${assignmentId}/problems`} icon={Flag}>Delay, problem or receipt</ActionRow> : null}
            {can.changeRequest ? <ActionRow href={`/assignments/${assignmentId}/changes`} icon={MessageSquare}>Request a change</ActionRow> : null}
            {can.paymentTerms ? <ActionRow href={`/assignments/${assignmentId}/payment`} icon={Wallet} badge={prompt.badge} badgeTone={prompt.needsAction ? 'amber' : 'muted'}>Payment terms</ActionRow> : null}
            {can.shareProgress ? <ActionRow href={`/errands/${current.errandId}/share`} icon={Share2}>Trusted-contact link</ActionRow> : null}
            {can.noShow ? <ActionRow href={`/assignments/${assignmentId}/no-show`} icon={UserX}>No-show report</ActionRow> : null}
            {current.disputeId ? <ActionRow href={`/disputes/${current.disputeId}`} icon={Scale}>View dispute</ActionRow> : null}
            {can.dispute && !current.disputeId ? <ActionRow href={`/assignments/${assignmentId}/dispute`} icon={Scale}>Open a dispute</ActionRow> : null}
            <ActionRow href={`/safety?assignmentId=${assignmentId}`} icon={ShieldCheck}>Safety &amp; support</ActionRow>
            {can.cancel ? <ActionRow href={`/assignments/${assignmentId}/cancel`} icon={X} danger>{isRunner ? 'Cancel as runner' : 'Cancel assignment'}</ActionRow> : null}
          </nav>
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
      {onRetry ? <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={onRetry}>Try again</Button> : null}
    </Alert>
  );
}
