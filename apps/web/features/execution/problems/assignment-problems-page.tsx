'use client';

import { PageLoading } from '@/components/shell/page-loading';
import { useApiMutation } from '@/lib/query/mutations';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { PageHead } from '@/components/shell/page-head';
import { ArrowLeft } from 'lucide-react';
import { DurationInput } from '@/components/forms/duration-input';
import { Alert, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '@urgent/ui';
import { MediaUpload } from '@/components/media-upload/media-upload';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { offersApi, type ExecutionProblem } from '@/features/offers/api';
import { JourneyHere } from '@/features/journey/journey-context';

type ProblemType = components['schemas']['ReportProblemDto']['type'];
type DelayReason = components['schemas']['DelayNoticeDto']['reason'];

const problemTypes: ProblemType[] = ['ITEM_NOT_READY', 'RECIPIENT_UNREACHABLE', 'WRONG_ADDRESS', 'ITEM_PROBLEM', 'OTHER'];
const delayReasons: DelayReason[] = ['TRAFFIC', 'ITEM_NOT_READY', 'QUEUE', 'TRANSPORT', 'PERSONAL', 'OTHER'];

function label(value: string) {
  return value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function categoryKey(category: unknown): string | null {
  if (typeof category !== 'object' || category === null || Array.isArray(category)) return null;
  const key = (category as Record<string, unknown>).key;
  return typeof key === 'string' ? key.toUpperCase() : null;
}

function ProblemRow({ problem, onResolve, resolving }: {
  problem: ExecutionProblem;
  onResolve: (id: string) => void;
  resolving: boolean;
}) {
  return (
    <li className="grid gap-2 rounded-[var(--r-sm)] bg-panel p-3.5">
      <div>
        <p className="text-sm font-extrabold text-ink">{label(problem.type)} <span className="font-semibold text-muted">· {label(problem.status)}</span></p>
        {problem.note ? <p className="mt-1 text-sm text-ink-2">{problem.note}</p> : null}
        {problem.suggestDispute ? <p className="mt-1 text-xs font-bold text-amber">There are multiple open problems. Consider opening a dispute.</p> : null}
      </div>
      {problem.status === 'OPEN' ? (
        <Button type="button" size="sm" variant="ghost" className="w-fit" disabled={resolving} onClick={() => onResolve(problem.id)}>
          Mark resolved
        </Button>
      ) : null}
    </li>
  );
}

export function AssignmentProblemsPage({ assignmentId }: { assignmentId: string }) {
  const client = useQueryClient();
  const assignmentKey = queryKeys.assignments.detail(assignmentId);
  const problemsKey = queryKeys.assignments.problems(assignmentId);
  const assignment = useQuery({
    queryKey: assignmentKey,
    queryFn: () => offersApi.assignment(assignmentId),
    retry: false,
  });
  const problems = useQuery({
    queryKey: problemsKey,
    queryFn: () => offersApi.executionProblems(assignmentId),
    retry: false,
  });
  const [problemType, setProblemType] = useState<ProblemType>('OTHER');
  const [problemNote, setProblemNote] = useState('');
  const [problemMediaId, setProblemMediaId] = useState<string>();
  const [delayReason, setDelayReason] = useState<DelayReason>('TRAFFIC');
  const [estimate, setEstimate] = useState<number | null>(30);
  const [delayNote, setDelayNote] = useState('');
  const [receiptMediaId, setReceiptMediaId] = useState<string>();
  const [receiptNote, setReceiptNote] = useState('');

  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: problemsKey }),
      client.invalidateQueries({ queryKey: queryKeys.assignments.timeline(assignmentId) }),
    ]);
  };
  const reportProblem = useApiMutation({ affects: ['assignments'],
    mutationFn: () => offersApi.reportExecutionProblem(assignmentId, {
      type: problemType,
      ...(problemNote.trim() ? { note: problemNote.trim() } : {}),
      ...(problemMediaId ? { mediaId: problemMediaId } : {}),
    }),
    onSuccess: async () => {
      setProblemNote('');
      setProblemMediaId(undefined);
      await refresh();
    },
  });
  const resolveProblem = useApiMutation({ affects: ['assignments'],
    mutationFn: (problemId: string) => offersApi.resolveExecutionProblem(assignmentId, problemId),
    onSuccess: refresh,
  });
  const delay = useApiMutation({ affects: ['assignments'],
    mutationFn: () => offersApi.delayNotice(assignmentId, {
      reason: delayReason,
      newEstimateMinutes: estimate ?? 0,
      ...(delayNote.trim() ? { note: delayNote.trim() } : {}),
    }),
    onSuccess: async () => {
      setDelayNote('');
      await refresh();
    },
  });
  const receipt = useApiMutation({ affects: ['assignments'],
    mutationFn: () => {
      if (!receiptMediaId) throw new Error('Choose a receipt photo first.');
      return offersApi.addReceipt(assignmentId, {
        mediaId: receiptMediaId,
        ...(receiptNote.trim() ? { note: receiptNote.trim() } : {}),
      });
    },
    onSuccess: async () => {
      setReceiptNote('');
      setReceiptMediaId(undefined);
      await refresh();
    },
  });

  if (assignment.isPending || problems.isPending) {
    return <PageLoading title="Problems and delays" eyebrow="Assignment" width="max-w-5xl" />;
  }
  if (assignment.error || !assignment.data || problems.error || !problems.data) {
    const error = assignment.error ?? problems.error;
    return (
      <main className="grid min-w-0 content-start gap-4 pb-10">
        <Alert variant="danger" role="alert">
          <p>{isApiError(error) && error.code === 'RESOURCE_NOT_FOUND'
            ? 'This assignment could not be found, or you do not have permission to view it.'
            : 'We could not load the assignment problems.'}</p>
          <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => { void assignment.refetch(); void problems.refetch(); }}>Try again</Button>
        </Alert>
      </main>
    );
  }

  const current = assignment.data.data;
  const isRunner = current.role === 'RUNNER';
  const isShopping = categoryKey(current.errand.category) === 'SHOPPING_PURCHASE';
  const hasOpenProblem = problems.data.some((problem) => problem.status === 'OPEN');

  const openCount = problems.data.filter((problem) => problem.status === 'OPEN').length;
  const reported = (
    <section className="grid min-w-0 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px] content-start gap-3 lg:sticky lg:top-6" aria-labelledby="reported-problems">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="reported-problems" className="text-base font-extrabold text-ink">Reported problems</h2>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${openCount ? 'bg-amber-bg text-amber' : 'bg-panel text-muted'}`}>{openCount ? `${openCount} open` : 'None open'}</span>
      </div>
      {problems.data.length ? <ul className="grid gap-2">{problems.data.map((problem) => (
        <ProblemRow key={problem.id} problem={problem} onResolve={(id) => resolveProblem.mutate(id)} resolving={resolveProblem.isPending} />
      ))}</ul> : <p className="py-4 text-center text-sm text-muted">No problems have been reported.</p>}
      {openCount >= 2 ? (
        <Button asChild variant="ghost" className="w-fit"><Link href={`/assignments/${assignmentId}/dispute`}>Open a dispute</Link></Button>
      ) : null}
      {resolveProblem.error ? <MutationError error={resolveProblem.error} fallback="We could not resolve the problem." /> : null}
      {resolveProblem.isSuccess ? <Alert variant="ok" role="status">Problem resolved.</Alert> : null}
    </section>
  );

  return (
    <main className="grid min-w-0 content-start gap-4 pb-10">
      <Link href={`/assignments/${assignmentId}`} className="inline-flex w-fit items-center gap-2 text-xs font-bold text-green-900 hover:underline max-sm:hidden"><ArrowLeft aria-hidden="true" className="size-4" />Back to assignment</Link>
      <PageHead
        eyebrow="Errand support"
        title={<span className="block max-w-[760px] break-words">{current.errand.title}</span>}
        description="Report problems as they happen. The other party can see the report and its resolution."
      />
      <JourneyHere />

      {isRunner ? (
        <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid min-w-0 content-start gap-4">
            <section className="grid min-w-0 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px] gap-4" aria-labelledby="report-problem">
              <h2 id="report-problem" className="text-base font-extrabold text-ink">Report a problem</h2>
              <div className="grid gap-1.5">
                <label className="text-xs font-bold text-ink-2" htmlFor="problem-type">Problem type</label>
                <Select value={problemType} onValueChange={(value) => setProblemType(value as ProblemType)}>
                  <SelectTrigger id="problem-type"><SelectValue /></SelectTrigger>
                  <SelectContent>{problemTypes.map((type) => <SelectItem key={type} value={type}>{label(type)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-bold text-ink-2" htmlFor="problem-note">Details <span className="font-normal text-muted">(optional)</span></label>
                <Textarea id="problem-note" maxLength={500} value={problemNote} onChange={(event) => setProblemNote(event.target.value)} />
              </div>
              <MediaUpload purpose="PICKUP_EVIDENCE" maxFiles={1} value={problemMediaId ? [problemMediaId] : []} onChange={(ids: string[]) => setProblemMediaId(ids[0])} />
              {reportProblem.error ? <MutationError error={reportProblem.error} fallback="We could not report the problem." /> : null}
              {reportProblem.isSuccess ? <Alert variant="ok" role="status">Problem reported.</Alert> : null}
              <div className="flex justify-end border-t border-line-2 pt-4">
                <Button type="button" disabled={reportProblem.isPending} onClick={() => reportProblem.mutate()}>{reportProblem.isPending ? 'Reporting…' : 'Report problem'}</Button>
              </div>
            </section>

            <section className="grid min-w-0 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px] gap-4" aria-labelledby="delay-notice">
              <div>
                <h2 id="delay-notice" className="text-base font-extrabold text-ink">Send a delay notice</h2>
                <p className="mt-1 text-xs text-muted">You can send up to three notices for this errand. The new estimate starts from now.</p>
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-bold text-ink-2" htmlFor="delay-reason">Reason</label>
                <Select value={delayReason} onValueChange={(value) => setDelayReason(value as DelayReason)}>
                  <SelectTrigger id="delay-reason"><SelectValue /></SelectTrigger>
                  <SelectContent>{delayReasons.map((reason) => <SelectItem key={reason} value={reason}>{label(reason)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <span className="text-xs font-bold text-ink-2">Time until completion</span>
                <DurationInput id="delay-estimate" value={estimate} onChange={setEstimate} />
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-bold text-ink-2" htmlFor="delay-note">Note <span className="font-normal text-muted">(optional)</span></label>
                <Textarea id="delay-note" maxLength={500} value={delayNote} onChange={(event) => setDelayNote(event.target.value)} />
              </div>
              {delay.error ? <MutationError error={delay.error} fallback="We could not send the delay notice." /> : null}
              {delay.isSuccess ? <Alert variant="ok" role="status">Delay notice sent.</Alert> : null}
              <div className="flex justify-end border-t border-line-2 pt-4">
                <Button type="button" disabled={delay.isPending || estimate === null || estimate < 1 || estimate > 1440} onClick={() => delay.mutate()}>{delay.isPending ? 'Sending…' : 'Send delay notice'}</Button>
              </div>
            </section>

            {isShopping ? (
              <section className="grid min-w-0 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px] gap-4" aria-labelledby="purchase-receipt">
                <h2 id="purchase-receipt" className="text-base font-extrabold text-ink">Add a purchase receipt</h2>
                <MediaUpload purpose="PURCHASE_RECEIPT" maxFiles={1} value={receiptMediaId ? [receiptMediaId] : []} onChange={(ids: string[]) => setReceiptMediaId(ids[0])} />
                <div className="grid gap-1.5">
                  <label className="text-xs font-bold text-ink-2" htmlFor="receipt-note">Note <span className="font-normal text-muted">(optional)</span></label>
                  <Textarea id="receipt-note" maxLength={500} value={receiptNote} onChange={(event) => setReceiptNote(event.target.value)} />
                </div>
                {receipt.error ? <MutationError error={receipt.error} fallback="We could not add the receipt." /> : null}
                {receipt.isSuccess ? <Alert variant="ok" role="status">Receipt added.</Alert> : null}
                <div className="flex justify-end border-t border-line-2 pt-4">
                  <Button type="button" disabled={!receiptMediaId || receipt.isPending} onClick={() => receipt.mutate()}>{receipt.isPending ? 'Adding…' : 'Add receipt'}</Button>
                </div>
              </section>
            ) : null}
          </div>
          {reported}
        </div>
      ) : reported}
    </main>
  );
}

function MutationError({ error, fallback }: { error: unknown; fallback: string }) {
  return (
    <Alert variant="danger" role="alert">
      <p>{isApiError(error) ? error.message : fallback}</p>
    </Alert>
  );
}
