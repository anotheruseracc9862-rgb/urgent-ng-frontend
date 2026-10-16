'use client';

import { PageLoading } from '@/components/shell/page-loading';
import { useApiMutation } from '@/lib/query/mutations';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { MediaUpload } from '@/components/media-upload/media-upload';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { offersApi, type ExecutionProblem } from '@/features/offers/api';

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
    <li className="grid gap-2 rounded-xl bg-panel p-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <p className="font-bold text-ink">{label(problem.type)} · {label(problem.status)}</p>
        {problem.note ? <p className="mt-1 text-sm text-ink-2">{problem.note}</p> : null}
        {problem.suggestDispute ? <p className="mt-1 text-sm font-bold text-amber-900">There are multiple open problems. Consider opening a dispute.</p> : null}
      </div>
      {problem.status === 'OPEN' ? (
        <Button type="button" size="sm" variant="ghost" disabled={resolving} onClick={() => onResolve(problem.id)}>
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
  const [estimate, setEstimate] = useState('30');
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
      newEstimateMinutes: Number(estimate),
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
    return <PageLoading title="Problems and delays" eyebrow="Assignment" width="max-w-3xl" />;
  }
  if (assignment.error || !assignment.data || problems.error || !problems.data) {
    const error = assignment.error ?? problems.error;
    return (
      <main className="mx-auto max-w-3xl">
        <Alert variant="danger" role="alert">
          <p>{isApiError(error) && error.code === 'RESOURCE_NOT_FOUND'
            ? 'This assignment could not be found, or you do not have permission to view it.'
            : 'We could not load the assignment problems.'}</p>
          {isApiError(error) && error.requestId ? <p className="mt-1 text-xs">Request ID: {error.requestId}</p> : null}
          <Button type="button" variant="ghost" className="mt-2" onClick={() => { void assignment.refetch(); void problems.refetch(); }}>Try again</Button>
        </Alert>
      </main>
    );
  }

  const current = assignment.data.data;
  const isRunner = current.role === 'RUNNER';
  const isShopping = categoryKey(current.errand.category) === 'SHOPPING_PURCHASE';
  const hasOpenProblem = problems.data.some((problem) => problem.status === 'OPEN');

  return (
    <main className="mx-auto grid max-w-3xl gap-4">
      <Link href={`/assignments/${assignmentId}`} className="w-fit text-sm font-bold text-green-800 hover:underline">← Back to assignment</Link>
      <header>
        <p className="text-xs font-extrabold uppercase tracking-wide text-green-800">Errand support</p>
        <h1 className="mt-1 text-2xl font-extrabold text-ink sm:text-3xl">{current.errand.title}</h1>
        <p className="mt-2 text-sm text-muted">Report problems as they happen. The other party can see the report and its resolution.</p>
      </header>

      <section className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
        <h2 className="font-extrabold text-ink">Reported problems</h2>
        {problems.data.length ? <ul className="grid gap-2">{problems.data.map((problem) => (
          <ProblemRow key={problem.id} problem={problem} onResolve={(id) => resolveProblem.mutate(id)} resolving={resolveProblem.isPending} />
        ))}</ul> : <p className="text-sm text-muted">No problems have been reported.</p>}
        {hasOpenProblem && problems.data.filter((problem) => problem.status === 'OPEN').length >= 2 ? (
          <Button asChild variant="ghost" className="w-fit"><Link href={`/assignments/${assignmentId}/dispute`}>Open a dispute</Link></Button>
        ) : null}
      </section>

      {isRunner ? (
        <>
          <section className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
            <h2 className="font-extrabold text-ink">Report a problem</h2>
            <label className="grid gap-1 text-sm font-bold text-ink">Problem type
              <select value={problemType} onChange={(event) => setProblemType(event.target.value as ProblemType)} className="rounded-lg border border-line bg-panel p-3 font-normal">
                {problemTypes.map((type) => <option key={type} value={type}>{label(type)}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold text-ink">Details (optional)
              <textarea maxLength={500} value={problemNote} onChange={(event) => setProblemNote(event.target.value)} className="min-h-20 rounded-lg border border-line bg-panel p-3 font-normal" />
            </label>
            <MediaUpload purpose="PICKUP_EVIDENCE" maxFiles={1} value={problemMediaId ? [problemMediaId] : []} onChange={(ids: string[]) => setProblemMediaId(ids[0])} />
            {reportProblem.error ? <MutationError error={reportProblem.error} fallback="We could not report the problem." /> : null}
            {reportProblem.isSuccess ? <Alert variant="ok" role="status">Problem reported.</Alert> : null}
            <Button type="button" className="w-fit" disabled={reportProblem.isPending} onClick={() => reportProblem.mutate()}>{reportProblem.isPending ? 'Reporting…' : 'Report problem'}</Button>
          </section>

          <section className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
            <h2 className="font-extrabold text-ink">Send a delay notice</h2>
            <p className="text-sm text-muted">You can send up to three notices for this errand. The new estimate starts from now.</p>
            <label className="grid gap-1 text-sm font-bold text-ink">Reason
              <select value={delayReason} onChange={(event) => setDelayReason(event.target.value as DelayReason)} className="rounded-lg border border-line bg-panel p-3 font-normal">
                {delayReasons.map((reason) => <option key={reason} value={reason}>{label(reason)}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold text-ink">Estimated minutes until completion
              <input type="number" min={1} max={1440} value={estimate} onChange={(event) => setEstimate(event.target.value)} className="rounded-lg border border-line bg-panel p-3 font-normal" />
            </label>
            <label className="grid gap-1 text-sm font-bold text-ink">Note (optional)
              <textarea maxLength={500} value={delayNote} onChange={(event) => setDelayNote(event.target.value)} className="min-h-20 rounded-lg border border-line bg-panel p-3 font-normal" />
            </label>
            {delay.error ? <MutationError error={delay.error} fallback="We could not send the delay notice." /> : null}
            {delay.isSuccess ? <Alert variant="ok" role="status">Delay notice sent.</Alert> : null}
            <Button type="button" className="w-fit" disabled={delay.isPending || Number(estimate) < 1 || Number(estimate) > 1440} onClick={() => delay.mutate()}>{delay.isPending ? 'Sending…' : 'Send delay notice'}</Button>
          </section>

          {isShopping ? (
            <section className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
              <h2 className="font-extrabold text-ink">Add a purchase receipt</h2>
              <MediaUpload purpose="PURCHASE_RECEIPT" maxFiles={1} value={receiptMediaId ? [receiptMediaId] : []} onChange={(ids: string[]) => setReceiptMediaId(ids[0])} />
              <label className="grid gap-1 text-sm font-bold text-ink">Note (optional)
                <textarea maxLength={500} value={receiptNote} onChange={(event) => setReceiptNote(event.target.value)} className="min-h-20 rounded-lg border border-line bg-panel p-3 font-normal" />
              </label>
              {receipt.error ? <MutationError error={receipt.error} fallback="We could not add the receipt." /> : null}
              {receipt.isSuccess ? <Alert variant="ok" role="status">Receipt added.</Alert> : null}
              <Button type="button" className="w-fit" disabled={!receiptMediaId || receipt.isPending} onClick={() => receipt.mutate()}>{receipt.isPending ? 'Adding…' : 'Add receipt'}</Button>
            </section>
          ) : null}
        </>
      ) : null}
      {resolveProblem.error ? <MutationError error={resolveProblem.error} fallback="We could not resolve the problem." /> : null}
      {resolveProblem.isSuccess ? <Alert variant="ok" role="status">Problem resolved.</Alert> : null}
    </main>
  );
}

function MutationError({ error, fallback }: { error: unknown; fallback: string }) {
  return (
    <Alert variant="danger" role="alert">
      <p>{isApiError(error) ? error.message : fallback}</p>
      {isApiError(error) && error.requestId ? <p className="mt-1 text-xs">Request ID: {error.requestId}</p> : null}
    </Alert>
  );
}
