'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Flag, MessageSquare } from 'lucide-react';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { PageHead } from '@/components/shell/page-head';
import { useSession } from '@/lib/auth/client';
import { useLivePolling } from '@/features/realtime/use-live-polling';
import { errandQueries } from '../queries';
import type { ErrandSummary } from '../api';
import { availableActions } from '@/features/assignments/available-actions';
import { EXECUTION_STEPS, flowOf } from '@/features/reference/flow';

/** Where each errand status sits on the five milestones. -1 means the runner has not accepted yet. */
const STAGE_INDEX: Partial<Record<ErrandSummary['status'], number>> = {
  RUNNER_SELECTED: -1,
  ACCEPTED: 0,
  IN_PROGRESS: 1,
  PICKED_UP: 2,
  DELIVERED: 3,
  DISPUTED: 1,
};

const BADGE_LABEL: Partial<Record<ErrandSummary['status'], string>> = {
  RUNNER_SELECTED: 'Waiting for the runner to accept',
  ACCEPTED: 'Accepted',
  IN_PROGRESS: 'On the way to pickup',
  PICKED_UP: 'Picked up',
  DELIVERED: 'Delivered · confirm',
  DISPUTED: 'In dispute',
};

/** A service reads "work", not "pickup" and "delivery". */
const SERVICE_BADGE_LABEL: Partial<Record<ErrandSummary['status'], string>> = {
  IN_PROGRESS: 'On the way',
  PICKED_UP: 'Work in progress',
  DELIVERED: 'Finished · confirm',
};

function money(minor: number | null) {
  return minor === null
    ? '—'
    : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(minor / 100);
}

function TrackCard({ errand }: { errand: ErrandSummary }) {
  const stage = STAGE_INDEX[errand.status] ?? 0;
  const runner = errand.runner;
  const assignment = errand.assignmentId ? encodeURIComponent(errand.assignmentId) : null;
  const delivered = errand.status === 'DELIVERED';
  const flow = flowOf(errand.category);
  const service = flow === 'SERVICE';
  const badgeLabel = (service ? SERVICE_BADGE_LABEL[errand.status] : undefined) ?? BADGE_LABEL[errand.status] ?? errand.status.replaceAll('_', ' ');
  const can = availableActions('REQUESTER', errand.status === 'RUNNER_SELECTED' ? 'PENDING_ACCEPTANCE' : 'ACCEPTED', errand.status, errand.category);
  const link = 'relative z-10 inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[13.5px] font-bold';
  const soft = 'relative z-10 inline-flex min-h-9 items-center rounded-full bg-panel px-3.5 text-[12.5px] font-bold text-ink hover:bg-tint-2';

  return (
    <section className="relative rounded-[var(--r-lg)] bg-surface p-5 shadow-[var(--shadow)] transition-shadow hover:shadow-[var(--shadow-pop)] motion-reduce:transition-none sm:p-[22px]" aria-labelledby={`track-${errand.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold ${delivered ? 'bg-ok-bg text-ok' : 'bg-blue-bg text-blue'}`}>
          {delivered ? null : <span aria-hidden="true" className="size-[7px] animate-pulse rounded-full bg-current" />}
          {badgeLabel}
        </span>
        <span className="text-xl font-extrabold tracking-[-0.03em] tabular-nums text-ink">{money(errand.agreedAmountMinor)}</span>
      </div>

      <h2 id={`track-${errand.id}`} className="mb-1 mt-3 text-xl font-extrabold tracking-[-0.02em] text-ink">
        <Link href={assignment ? `/assignments/${assignment}` : `/errands/${errand.id}`} className="hover:underline after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-green-700">{errand.title}</Link>
      </h2>
      <p className="text-sm text-muted">
        {runner ? `Runner: ${runner.firstName}${runner.lastName ? ` ${runner.lastName[0]}.` : ''} · ` : ''}
        Agreed {money(errand.agreedAmountMinor)} · paid directly
      </p>

      <ol aria-label="Milestones" className="mt-4 grid grid-flow-col auto-cols-fr gap-1.5">
        {EXECUTION_STEPS[flow].map((label, index) => (
          <li key={label} className="grid gap-2">
            <i className={`block h-1.5 rounded-full ${index < stage ? 'bg-lime-600' : index === stage ? 'bg-ink' : 'bg-line'}`} />
            <b className={`text-xs ${index === stage ? 'text-ink' : 'text-muted'}`}>{label}</b>
          </li>
        ))}
      </ol>

      <div className="mt-4 grid gap-2 rounded-[var(--r-sm)] bg-panel px-3.5 py-3 text-[12.5px]">
        <div className="flex items-start gap-2.5"><i aria-hidden="true" className="mt-[5px] size-2.5 shrink-0 rounded-full bg-lime-600" /><span>{service ? (errand.destinationArea ?? 'Service area') : (errand.pickupArea ?? 'Pickup area')}</span></div>
        {errand.destinationArea && !service ? <div className="flex items-start gap-2.5"><i aria-hidden="true" className="mt-[5px] size-2.5 shrink-0 rounded-full bg-ink" /><span>{errand.destinationArea}</span></div> : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2.5">
        {assignment ? (
          <Link href={`/assignments/${assignment}`} className={`${link} bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-panel`}>View assignment</Link>
        ) : null}
        {assignment && can.confirmDelivery ? (
          <Link href={`/assignments/${assignment}/confirm`} className={`${link} bg-lime text-ink hover:bg-lime-600`}>{service ? 'Confirm work done' : 'Confirm delivery'}</Link>
        ) : null}
        {assignment && can.trackRunner ? (
          <Link href={`/assignments/${assignment}/track`} className={`${link} bg-ink text-white hover:bg-[#0f1822]`}>Live tracker</Link>
        ) : null}
        {errand.conversationId && errand.status !== 'RUNNER_SELECTED' ? (
          <Link href={`/messages/${encodeURIComponent(errand.conversationId)}`} className={`${link} bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-panel`}>
            <MessageSquare aria-hidden="true" className="size-4" />Message{runner ? ` ${runner.firstName}` : ''}
          </Link>
        ) : null}
        {can.shareProgress ? <Link href={`/errands/${errand.id}/share`} className={`${link} bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-panel`}>Share with trusted contact</Link> : null}
      </div>

      {assignment && (can.paymentTerms || can.changeRequest || can.dispute || can.cancel) ? (
        <>
          <hr className="my-[18px] border-0 border-t border-line" />
          <div className="flex flex-wrap gap-2">
            <Link href={`/errands/${errand.id}`} className={soft}>Errand details</Link>
            {can.paymentTerms ? <Link href={`/assignments/${assignment}/payment`} className={soft}>Payment terms</Link> : null}
            {can.changeRequest ? <Link href={`/assignments/${assignment}/changes`} className={soft}>Change request</Link> : null}
            {can.dispute ? <Link href={`/assignments/${assignment}/dispute`} className={soft}>Open a dispute</Link> : null}
            {can.cancel ? <Link href={`/assignments/${assignment}/cancel`} className="relative z-10 inline-flex min-h-9 items-center rounded-full bg-red-bg px-3.5 text-[12.5px] font-bold text-red hover:bg-[#ffe1dc]">Cancel</Link> : null}
          </div>
        </>
      ) : null}
    </section>
  );
}

/** The requester's view of errands that have a runner: milestones, live tracker, and the safety and money actions. */
export function TrackErrandsPage() {
  const { me } = useSession();
  const polling = useLivePolling(30_000);
  const active = useQuery({ ...errandQueries.tracked(me.id), refetchInterval: polling });
  const items = active.data?.data ?? [];

  return (
    <div className="grid content-start gap-4 pb-10">
      <PageHead
        eyebrow="Requester"
        title="Track your errands"
        description="A shared view of the agreed errand, its milestones and safety information."
        actions={<Button variant="ghost" asChild><Link href="/safety"><Flag aria-hidden="true" className="size-4" />Get help</Link></Button>}
      />

      {active.error ? (
        <Alert variant="danger" role="alert">
          <p>We could not load your errands in progress.</p>
          <Button type="button" variant="ghost" size="sm" onClick={() => void active.refetch()}>Try again</Button>
        </Alert>
      ) : null}

      {active.isPending ? (
        <div className="grid gap-4" aria-label="Loading errands"><Skeleton className="h-72 rounded-[var(--r-lg)]" /></div>
      ) : items.length ? (
        items.map((errand) => <TrackCard key={errand.id} errand={errand} />)
      ) : !active.error ? (
        <div className="grid justify-items-center gap-2.5 rounded-[var(--r-lg)] bg-surface px-5 py-10 text-center shadow-[var(--shadow)]">
          <h2 className="text-[15px] font-extrabold text-ink">No errands in progress</h2>
          <p className="max-w-md text-sm text-muted">When a runner accepts your errand, you can follow it here, share progress with someone you trust and message the runner.</p>
          <div className="mt-1 flex flex-wrap justify-center gap-2.5">
            <Button asChild><Link href="/errands/new">Post an errand</Link></Button>
            <Button variant="ghost" asChild><Link href="/errands">My errands</Link></Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
