'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Flag, MessageSquare } from 'lucide-react';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { PageHead } from '@/components/shell/page-head';
import { isApiError } from '@/lib/api/client';
import { useSession } from '@/lib/auth/client';
import { queryKeys } from '@/lib/query/keys';
import { errandsApi, type ErrandSummary } from '../api';

const STAGES = ['Accepted', 'Started', 'Picked up', 'Delivered', 'Done'];

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
  const link = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[13.5px] font-bold';
  const soft = 'inline-flex min-h-9 items-center rounded-full bg-panel px-3.5 text-[12.5px] font-bold text-ink hover:bg-tint-2';

  return (
    <section className="rounded-[var(--r-lg)] bg-surface p-5 shadow-[var(--shadow)] sm:p-[22px]" aria-labelledby={`track-${errand.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold ${delivered ? 'bg-ok-bg text-ok' : 'bg-blue-bg text-blue'}`}>
          {delivered ? null : <span aria-hidden="true" className="size-[7px] animate-pulse rounded-full bg-current" />}
          {BADGE_LABEL[errand.status] ?? errand.status.replaceAll('_', ' ')}
        </span>
        <span className="text-xl font-extrabold tracking-[-0.03em] tabular-nums text-ink">{money(errand.agreedAmountMinor)}</span>
      </div>

      <h2 id={`track-${errand.id}`} className="mb-1 mt-3 text-xl font-extrabold tracking-[-0.02em] text-ink">
        <Link href={`/errands/${errand.id}`} className="hover:underline">{errand.title}</Link>
      </h2>
      <p className="text-sm text-muted">
        {runner ? `Runner: ${runner.firstName}${runner.lastName ? ` ${runner.lastName[0]}.` : ''} · ` : ''}
        Agreed {money(errand.agreedAmountMinor)} · paid directly
      </p>

      <ol aria-label="Milestones" className="mt-4 grid grid-flow-col auto-cols-fr gap-1.5">
        {STAGES.map((label, index) => (
          <li key={label} className="grid gap-2">
            <i className={`block h-1.5 rounded-full ${index < stage ? 'bg-lime-600' : index === stage ? 'bg-ink' : 'bg-line'}`} />
            <b className={`text-xs ${index === stage ? 'text-ink' : 'text-muted'}`}>{label}</b>
          </li>
        ))}
      </ol>

      <div className="mt-4 grid gap-2 rounded-[var(--r-sm)] bg-panel px-3.5 py-3 text-[12.5px]">
        <div className="flex items-start gap-2.5"><i aria-hidden="true" className="mt-[5px] size-2.5 shrink-0 rounded-full bg-lime-600" /><span>{errand.pickupArea ?? 'Pickup area'}</span></div>
        {errand.destinationArea ? <div className="flex items-start gap-2.5"><i aria-hidden="true" className="mt-[5px] size-2.5 shrink-0 rounded-full bg-ink" /><span>{errand.destinationArea}</span></div> : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2.5">
        {assignment && delivered ? (
          <Link href={`/assignments/${assignment}/confirm`} className={`${link} bg-lime text-ink hover:bg-lime-600`}>Confirm delivery</Link>
        ) : null}
        {assignment ? (
          <Link href={`/assignments/${assignment}/track`} className={`${link} bg-ink text-white hover:bg-[#0f1822]`}>Live tracker</Link>
        ) : null}
        {errand.conversationId ? (
          <Link href={`/messages/${encodeURIComponent(errand.conversationId)}`} className={`${link} bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-panel`}>
            <MessageSquare aria-hidden="true" className="size-4" />Message{runner ? ` ${runner.firstName}` : ''}
          </Link>
        ) : null}
        <Link href={`/errands/${errand.id}/share`} className={`${link} bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-panel`}>Share with trusted contact</Link>
      </div>

      {assignment ? (
        <>
          <hr className="my-[18px] border-0 border-t border-line" />
          <div className="flex flex-wrap gap-2">
            <Link href={`/assignments/${assignment}/payment`} className={soft}>Payment terms</Link>
            <Link href={`/assignments/${assignment}/changes`} className={soft}>Change request</Link>
            <Link href={`/assignments/${assignment}/dispute`} className={soft}>Open a dispute</Link>
            <Link href={`/assignments/${assignment}/cancel`} className="inline-flex min-h-9 items-center rounded-full bg-red-bg px-3.5 text-[12.5px] font-bold text-red hover:bg-[#ffe1dc]">Cancel</Link>
          </div>
        </>
      ) : null}
    </section>
  );
}

/** The requester's view of errands that have a runner: milestones, live tracker, and the safety and money actions. */
export function TrackErrandsPage() {
  const { me } = useSession();
  const active = useQuery({
    queryKey: [...queryKeys.errands.list({ tab: 'ACTIVE', track: true }), me.id],
    queryFn: () => errandsApi.mine({ tab: 'ACTIVE', sort: 'NEEDS_ATTENTION', limit: 20 }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
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
          {isApiError(active.error) && active.error.requestId ? <p className="mt-1 text-xs">Request ID: {active.error.requestId}</p> : null}
          <Button type="button" variant="ghost" size="sm" onClick={() => void active.refetch()}>Try again</Button>
        </Alert>
      ) : null}

      {active.isLoading ? (
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
