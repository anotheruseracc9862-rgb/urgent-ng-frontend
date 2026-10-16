'use client';

import { PageLoading } from '@/components/shell/page-loading';
import { useApiMutation } from '@/lib/query/mutations';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { offersApi } from '@/features/offers/api';

function remaining(deadline: string, now: number) {
  const seconds = Math.max(0, Math.floor((Date.parse(deadline) - now) / 1000));
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function settledText(status: string) {
  if (status === 'CONFIRMED') return 'This no-show report is settled as confirmed.';
  if (status === 'DISMISSED') return 'This no-show report was dismissed.';
  if (status === 'CONTESTED') return 'This no-show report is contested and awaiting review.';
  return null;
}

export function NoShowPage({ assignmentId }: { assignmentId: string }) {
  const client = useQueryClient();
  const stateKey = queryKeys.assignments.noShow(assignmentId);
  const state = useQuery({
    queryKey: stateKey,
    queryFn: () => offersApi.noShowState(assignmentId),
    retry: false,
    refetchInterval: (query) => query.state.data?.report?.status === 'PENDING' ? 15_000 : false,
  });
  const assignment = useQuery({
    queryKey: queryKeys.assignments.detail(assignmentId),
    queryFn: () => offersApi.assignment(assignmentId),
    retry: false,
  });
  const [now, setNow] = useState(() => Date.now());
  const [note, setNote] = useState('');
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  const report = useApiMutation({ affects: ['assignments'],
    mutationFn: () => offersApi.reportNoShow(assignmentId, { ...(note.trim() ? { note: note.trim() } : {}) }),
    onSuccess: async () => {
      setNote('');
      await client.invalidateQueries({ queryKey: stateKey });
    },
    onError: async (error) => {
      if (isApiError(error) && error.code === 'RESOURCE_CONFLICT') await state.refetch();
    },
  });
  const respond = useApiMutation({ affects: ['assignments'],
    mutationFn: (response: 'PRESENT' | 'ACKNOWLEDGE') => offersApi.respondToNoShow(assignmentId, response),
    onSuccess: () => client.invalidateQueries({ queryKey: stateKey }),
    onError: async (error) => {
      if (isApiError(error) && error.code === 'RESOURCE_CONFLICT') await state.refetch();
    },
  });

  if (assignment.isPending || state.isPending) {
    return <PageLoading title="Report a no-show" eyebrow="Safety" width="max-w-3xl" />;
  }
  if (assignment.error || !assignment.data || state.error || !state.data) {
    const error = assignment.error ?? state.error;
    return (
      <main className="mx-auto max-w-3xl">
        <ApiError error={error} fallback="We could not load the no-show report." onRetry={() => { void assignment.refetch(); void state.refetch(); }} />
      </main>
    );
  }

  const current = state.data;
  const currentReport = current.report;
  const responseAllowed = currentReport !== null
    && currentReport.status === 'PENDING'
    && !currentReport.reportedByMe
    && Date.parse(currentReport.responseDueAt) > now;
  const overdue = currentReport?.status === 'PENDING' && Date.parse(currentReport.responseDueAt) <= now;
  const resolvedCopy = currentReport ? settledText(currentReport.status) : null;
  const earlyTime = current.earliestReportAt ? Date.parse(current.earliestReportAt) > now : false;

  return (
    <main className="mx-auto grid max-w-3xl gap-4">
      <Link href={`/assignments/${assignmentId}`} className="w-fit text-sm font-bold text-green-800 hover:underline">← Back to assignment</Link>
      <header>
        <p className="text-xs font-extrabold uppercase tracking-wide text-amber-900">No-show report</p>
        <h1 className="mt-1 text-2xl font-extrabold text-ink sm:text-3xl">{assignment.data.data.errand.title}</h1>
      </header>
      {currentReport ? (
        <section className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
          <h2 className="font-extrabold text-ink">Current report · {currentReport.status.toLowerCase()}</h2>
          {currentReport.note ? <p className="text-sm text-ink-2">{currentReport.note}</p> : null}
          {currentReport.status === 'PENDING' && currentReport.reportedByMe ? (
            <p className="text-sm text-ink-2">The other party has until <time dateTime={currentReport.responseDueAt}>{new Date(currentReport.responseDueAt).toLocaleString()}</time> to respond.</p>
          ) : null}
          {responseAllowed ? (
            <>
              <p className="text-sm text-amber-900">You have {remaining(currentReport.responseDueAt, now)} to respond. If you acknowledge the report, it will be confirmed. If you were present, the report will be contested for review.</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" disabled={respond.isPending} onClick={() => respond.mutate('PRESENT')}>I was present</Button>
                <Button type="button" variant="ghost" disabled={respond.isPending} onClick={() => respond.mutate('ACKNOWLEDGE')}>Acknowledge no-show</Button>
              </div>
            </>
          ) : null}
          {overdue ? <Alert variant="warn" role="status">The 15-minute response window has passed. The report is awaiting the server&apos;s settled status.</Alert> : null}
          {resolvedCopy ? <Alert variant={currentReport.status === 'CONFIRMED' ? 'danger' : 'info'} role="status">{resolvedCopy}</Alert> : null}
          {currentReport.resolutionSource === 'NO_RESPONSE' ? <p className="text-xs text-muted">Settled after no response before the deadline.</p> : null}
          {report.error ? <ApiError error={report.error} fallback="We could not submit the no-show report." /> : null}
          {respond.error ? <ApiError error={respond.error} fallback="We could not submit your response." /> : null}
        </section>
      ) : (
        <section className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
          <h2 className="font-extrabold text-ink">Report someone who did not arrive</h2>
          {current.canReport ? (
            <>
              <p className="text-sm text-muted">A report becomes available 30 minutes after the agreed time. The person reported gets 15 minutes to respond.</p>
              <label className="grid gap-1 text-sm font-bold text-ink">Note (optional)
                <textarea maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} className="min-h-20 rounded-lg border border-line bg-panel p-3 font-normal" />
              </label>
              <Button type="button" className="w-fit" disabled={report.isPending} onClick={() => report.mutate()}>{report.isPending ? 'Reporting…' : 'Report no-show'}</Button>
            </>
          ) : earlyTime ? (
            <Alert variant="warn" role="status">
              <p>You can report a no-show starting at <time dateTime={current.earliestReportAt!}>{new Date(current.earliestReportAt!).toLocaleString()}</time>.</p>
            </Alert>
          ) : (
            <Alert variant="info" role="status">No-show reporting is not available for this assignment right now.</Alert>
          )}
          {report.error ? <ApiError error={report.error} fallback="We could not submit the no-show report." /> : null}
        </section>
      )}
    </main>
  );
}

function ApiError({ error, fallback, onRetry }: { error: unknown; fallback: string; onRetry?: () => void }) {
  const tooEarly = isApiError(error) && error.code === 'RESOURCE_CONFLICT' && error.details.reason === 'TOO_EARLY';
  const earliest = tooEarly && typeof error.details.earliestReportAt === 'string' ? error.details.earliestReportAt : null;
  return (
    <Alert variant="danger" role="alert">
      <p>{tooEarly ? 'It is too early to report a no-show.' : isApiError(error) ? error.message : fallback}</p>
      {earliest ? <p className="mt-1 text-sm">Earliest report time: <time dateTime={earliest}>{new Date(earliest).toLocaleString()}</time></p> : null}
      {isApiError(error) && error.requestId ? <p className="mt-1 text-xs">Request ID: {error.requestId}</p> : null}
      {onRetry ? <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={onRetry}>Try again</Button> : null}
    </Alert>
  );
}
