'use client';

import { PageLoading } from '@/components/shell/page-loading';
import { PageHead } from '@/components/shell/page-head';
import { useApiMutation } from '@/lib/query/mutations';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Flag, MessageSquare, Share2, Wallet, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { Alert, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Skeleton } from '@urgent/ui';
import { MediaUpload } from '@/components/media-upload/media-upload';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { offersApi, type StepEvidence } from '@/features/offers/api';
import { RunnerLocationSharing } from '@/features/location/share/runner-location-sharing';
import { JourneyHere } from '@/features/journey/journey-context';
import { AssignmentTimeline } from '@/features/assignments/assignment-timeline';
import { ExecutionProgress } from '@/features/assignments/execution-progress';
import { availableActions } from '@/features/assignments/available-actions';

type Step = 'start' | 'pickup' | 'deliver';

const stepCopy: Record<Step, { title: string; action: string; purpose?: components['schemas']['MediaPurpose']; noteLabel?: string }> = {
  start: { title: 'Step 1 of 3 · Start the errand', action: 'Start errand' },
  pickup: { title: 'Step 2 of 3 · Record pickup', action: 'Confirm pickup', purpose: 'PICKUP_EVIDENCE', noteLabel: 'Pickup note' },
  deliver: { title: 'Step 3 of 3 · Record delivery', action: 'Confirm delivery', purpose: 'DELIVERY_EVIDENCE', noteLabel: 'Recipient or delivery note' },
};

/** What a person should read right after a step is recorded: what happened, and what is next. */
const recordedCopy: Record<Step, string> = {
  start: 'Errand started. Next: collect the item, then record pickup.',
  pickup: 'Pickup recorded. Next: take it to the drop-off, then record delivery below.',
  deliver: 'Delivery recorded. The requester now confirms it, or it completes by itself after 24 hours.',
};

const naira = (minor: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(minor / 100);

/** What the runner is doing now, in the demo's words. */
const doingNow: Record<string, string> = {
  ACCEPTED: 'Ready to start',
  IN_PROGRESS: 'Heading to pickup',
  PICKED_UP: 'Heading to drop-off',
};

const helpful = 'flex min-h-11 items-center justify-center gap-2 rounded-full bg-panel px-4 text-sm font-extrabold text-ink hover:bg-tint-2';

function nextStep(status: string): Step | null {
  if (status === 'ACCEPTED') return 'start';
  if (status === 'IN_PROGRESS') return 'pickup';
  if (status === 'PICKED_UP') return 'deliver';
  return null;
}

export function RunnerExecutionPage({ assignmentId }: { assignmentId: string }) {
  const queryClient = useQueryClient();
  const key = queryKeys.assignments.detail(assignmentId);
  const assignment = useQuery({
    queryKey: key,
    queryFn: () => offersApi.assignment(assignmentId),
    retry: false,
  });
  const timeline = useQuery({
    queryKey: queryKeys.assignments.timeline(assignmentId),
    queryFn: () => offersApi.assignmentTimeline(assignmentId),
    retry: false,
    enabled: Boolean(assignment.data),
  });
  const [recorded, setRecorded] = useState<Step | null>(null);
  const [note, setNote] = useState('');
  const [mediaId, setMediaId] = useState<string>();
  const [intent, setIntent] = useState<{ step: Step; key: string; evidence?: StepEvidence } | null>(null);
  const execute = useApiMutation({ affects: ['assignments'],
    mutationFn: (confirmed: NonNullable<typeof intent>) =>
      offersApi.executionStep(assignmentId, confirmed.step, confirmed.key, confirmed.evidence),
    onSuccess: async (_result, confirmed) => {
      setRecorded(confirmed.step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setIntent(null);
      setNote('');
      setMediaId(undefined);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: key }),
        queryClient.invalidateQueries({ queryKey: queryKeys.assignments.timeline(assignmentId) }),
      ]);
      await assignment.refetch();
    },
    onError: async (error) => {
      if (isApiError(error) && error.code === 'ERRAND_INVALID_STATE') {
        setIntent(null);
        setNote('');
        setMediaId(undefined);
        await assignment.refetch();
      }
    },
  });

  if (assignment.isPending) {
    return <PageLoading title="Task progress" eyebrow="Runner" width="max-w-5xl" />;
  }
  if (assignment.error || !assignment.data) {
    return (
      <main className="min-w-0">
        <Alert variant="danger" role="alert">
          <p>{isApiError(assignment.error) && assignment.error.code === 'RESOURCE_NOT_FOUND'
            ? 'This assignment could not be found, or you do not have permission to view it.'
            : 'We could not load the assignment steps.'}</p>
          {isApiError(assignment.error) && assignment.error.requestId ? <p className="mt-1 text-xs">Request ID: {assignment.error.requestId}</p> : null}
          <Button type="button" variant="ghost" className="mt-2" onClick={() => void assignment.refetch()}>Try again</Button>
        </Alert>
      </main>
    );
  }

  if (assignment.data.data.role !== 'RUNNER' || assignment.data.data.status !== 'ACCEPTED') {
    return (
      <main className="grid min-w-0 gap-3">
        <Alert variant="warn" role="status">Execution steps are available to the assigned runner while the assignment is active.</Alert>
        <Button asChild variant="ghost" className="w-fit"><Link href={`/assignments/${assignmentId}`}>Back to assignment</Link></Button>
      </main>
    );
  }

  const currentStep = nextStep(assignment.data.data.errand.status);
  const copy = currentStep ? stepCopy[currentStep] : null;

  const errand = assignment.data.data.errand;
  const errandId = assignment.data.data.errandId;
  const can = availableActions('RUNNER', assignment.data.data.status, errand.status);
  return (
    <main className="grid min-w-0 content-start gap-4 pb-10">
      <Link href={`/assignments/${assignmentId}`} className="inline-flex w-fit items-center gap-2 text-xs font-bold text-green-900 hover:underline">
        <ArrowLeft aria-hidden="true" className="size-4" />Back to assignment
      </Link>
      <PageHead
        eyebrow="Run the errand · Runner view"
        title={<span className="block max-w-[760px] break-words">{errand.title}</span>}
        description="Each step is visible to the requester. Photos are optional evidence."
      />
      <JourneyHere />

      {execute.error && !intent ? (
        <Alert variant="danger" role="alert">
          <p>{isApiError(execute.error) && execute.error.code === 'ERRAND_INVALID_STATE'
            ? 'The errand status changed. We refreshed the available next step.'
            : isApiError(execute.error)
              ? execute.error.message
              : 'We could not record this step.'}</p>
          {isApiError(execute.error) && execute.error.requestId ? <p className="mt-1 text-xs">Request ID: {execute.error.requestId}</p> : null}
          <Button type="button" variant="ghost" className="mt-2" onClick={() => void assignment.refetch()}>Refresh assignment</Button>
        </Alert>
      ) : null}
      {recorded ? <Alert variant="ok" role="status">{recordedCopy[recorded]}</Alert> : null}

      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 content-start gap-4 lg:col-start-1 lg:row-start-1">
          <section aria-label="Where the errand is" className="grid gap-4 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-bg px-2.5 py-1 text-[11px] font-extrabold text-blue">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />{doingNow[errand.status] ?? 'In progress'}
              </span>
              <span className="text-xl font-extrabold tabular-nums tracking-tight text-ink">{naira(assignment.data.data.agreedAmountMinor)}</span>
            </div>
            <ExecutionProgress errandStatus={errand.status} />
          </section>
          {copy ? (
            <section className="grid gap-4 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
              <div>
                <h2 className="text-base font-extrabold text-ink">{copy.title}</h2>
                <p className="mt-1 text-sm text-muted">Only the next valid step is available. The server confirms each status transition.</p>
              </div>
              {copy.noteLabel ? (
                <>
                  <label className="grid gap-1 text-sm font-bold text-ink">{copy.noteLabel}
                    <textarea maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} className="min-h-24 rounded-lg border border-line bg-panel p-3 text-sm font-normal" />
                  </label>
                  <div>
                    <p className="mb-2 text-sm font-bold text-ink">Optional photo evidence</p>
                    <MediaUpload purpose={copy.purpose!} maxFiles={1} value={mediaId ? [mediaId] : []} onChange={(ids: string[]) => setMediaId(ids[0])} />
                  </div>
                </>
              ) : null}
              <Button type="button" className="w-fit" disabled={execute.isPending} onClick={() => {
                if (!currentStep) return;
                execute.reset();
                setIntent({
                  step: currentStep,
                  key: crypto.randomUUID(),
                  ...(currentStep === 'start' ? {} : { evidence: {
                    ...(note.trim() ? { note: note.trim() } : {}),
                    ...(mediaId ? { mediaId } : {}),
                  } }),
                });
              }}>
                {execute.isPending ? 'Recording…' : copy.action}
              </Button>
            </section>
          ) : (
            <section className="grid gap-3 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
              <h2 className="font-extrabold text-ink">{errand.status === 'DELIVERED' ? 'Delivery recorded' : 'No further runner step is available'}</h2>
              {errand.status === 'DELIVERED' ? <p className="text-sm text-muted">Nothing more to do here. The requester confirms the delivery, or it completes automatically after 24 hours. A dispute pauses that.</p> : null}
              <p className="text-sm text-muted">The errand is currently {assignment.data.data.errand.status.toLowerCase().replaceAll('_', ' ')}. View the assignment for its current timeline and next actions.</p>
              <Button asChild variant="ghost" className="w-fit"><Link href={`/assignments/${assignmentId}`}>View assignment</Link></Button>
            </section>
          )}
          <RunnerLocationSharing assignmentId={assignmentId} />
          {timeline.error ? <Alert variant="danger" role="alert">We could not load the activity.</Alert> : null}
          {timeline.data ? <AssignmentTimeline events={timeline.data} title="Activity" /> : null}
        </div>

        <aside aria-label="Helpful actions" className="grid min-w-0 gap-3 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px] lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1">
          <h2 className="text-sm font-extrabold text-ink">Helpful actions</h2>
          {can.reportProblems ? <Link href={`/assignments/${assignmentId}/problems`} className={helpful}><Flag aria-hidden="true" className="size-4" />Delay, problem or receipt</Link> : null}
          {can.changeRequest ? <Link href={`/assignments/${assignmentId}/changes`} className={helpful}><MessageSquare aria-hidden="true" className="size-4" />Ask to change amount, address or time</Link> : null}
          {can.paymentTerms ? <Link href={`/assignments/${assignmentId}/payment`} className={helpful}><Wallet aria-hidden="true" className="size-4" />Payment terms</Link> : null}
          {can.shareProgress ? <Link href={`/errands/${errandId}/share`} className={helpful}><Share2 aria-hidden="true" className="size-4" />Trusted-contact link</Link> : null}
          {can.dispute && !can.cancel ? <Link href={`/assignments/${assignmentId}/dispute`} className={helpful}><Flag aria-hidden="true" className="size-4" />Something is wrong: open a dispute</Link> : null}
          {can.cancel ? <Link href={`/assignments/${assignmentId}/cancel`} className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-red-bg px-4 text-sm font-extrabold text-red hover:opacity-80"><X aria-hidden="true" className="size-4" />Cancel as runner</Link> : null}
        </aside>
      </div>
      <Dialog open={intent !== null && intent.step === currentStep} onOpenChange={(open) => { if (!open && !execute.isPending) setIntent(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{intent ? `${stepCopy[intent.step].action}?` : 'Confirm step'}</DialogTitle>
            <DialogDescription>
              {intent?.step === 'start' ? 'Confirm you are ready to begin. The requester will be notified.'
                : intent?.step === 'pickup' ? 'Confirm you have collected the item. Your note and any photo will be shared with the requester.'
                  : 'Confirm you have delivered the item. Your evidence will be shared with the requester, who can then confirm completion.'}
            </DialogDescription>
          </DialogHeader>
          {intent?.evidence?.note ? <p className="whitespace-pre-wrap break-words rounded-xl bg-panel p-3 text-sm text-ink-2">{intent.evidence.note}</p> : null}
          {intent?.evidence?.mediaId ? <p className="text-sm text-muted">One evidence photo attached.</p> : null}
          {execute.error ? <Alert variant="danger" role="alert">
            <p>We could not confirm this step. Try again with the same details.</p>
            {isApiError(execute.error) && execute.error.requestId ? <p className="mt-1 text-xs">Request ID: {execute.error.requestId}</p> : null}
          </Alert> : null}
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button type="button" variant="ghost" disabled={execute.isPending} onClick={() => setIntent(null)}>Go back</Button>
            <Button type="button" disabled={execute.isPending || !intent || intent.step !== currentStep} onClick={() => { if (intent) execute.mutate(intent); }}>
              {execute.isPending ? 'Recording…' : intent ? stepCopy[intent.step].action : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
