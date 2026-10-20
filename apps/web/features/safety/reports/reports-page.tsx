'use client';

import { PageLoading } from '@/components/shell/page-loading';
import { useLivePolling } from '@/features/realtime/use-live-polling';
import Link from 'next/link';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { safetyApi, safetyKeys } from '../api';
import { caseDate, CaseError, caseLabelText, casePanel } from '../case-ui';
import { EvidenceList } from '../evidence-list';

export function ReportsPage() {
  const query = useInfiniteQuery({ queryKey: safetyKeys.reports(), queryFn: ({ pageParam }) => safetyApi.reports(pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: last => last.meta?.nextCursor ?? undefined, retry: false });
  const reports = query.data?.pages.flatMap(page => page.data) ?? [];
  return <main className="mx-auto grid max-w-3xl gap-5"><header><h1 className="text-3xl font-extrabold">Your reports</h1><p className="mt-2 text-sm text-muted">Private updates from the safety team.</p></header><Button asChild className="w-fit"><Link href="/report">Report a concern</Link></Button>
    {query.isPending ? <Skeleton className="h-48 rounded-[var(--r-lg)]" /> : null}
    {query.error ? <CaseError error={query.error} retry={() => void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())} /> : null}
    {!query.isPending && !query.error && !reports.length ? <section className={casePanel}><h2 className="font-extrabold">No reports yet</h2><p className="text-sm text-muted">If something is wrong, report it from the relevant assignment, profile or rating.</p></section> : null}
    {reports.map(report => <Link href={`/reports/${report.id}`} key={report.id} className={casePanel}><h2 className="font-extrabold">{caseLabelText(report.type)}</h2><p className="text-xs text-green-800">{caseLabelText(report.status)} · {caseDate(report.createdAt)}</p><p className="line-clamp-2 break-words text-sm">{report.description}</p></Link>)}
    {query.hasNextPage ? <Button variant="ghost" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>Load more reports</Button> : null}
  </main>;
}

export function ReportDetailPage({ reportId }: { reportId: string }) {
  const polling = useLivePolling(30_000);
  const query = useQuery({ queryKey: safetyKeys.report(reportId), queryFn: () => safetyApi.report(reportId), retry: false, refetchInterval: polling });
  if (query.isPending) {
    return <PageLoading title="Reports" eyebrow="Safety" width="max-w-3xl" />;
  }
  if (!query.data || query.error) return <CaseError error={query.error} retry={() => void query.refetch()} />;
  const report = query.data;
  return <main className="mx-auto grid max-w-3xl gap-5"><Link href="/reports" className="text-sm font-bold text-green-800 max-sm:hidden">← Your reports</Link><header><p className="text-xs font-extrabold uppercase text-green-800">{caseLabelText(report.status)}</p><h1 className="mt-1 text-3xl font-extrabold">{caseLabelText(report.type)}</h1><p className="mt-2 break-all text-xs text-muted">Report reference: {report.id}</p></header>
    <section className={casePanel}><h2 className="font-extrabold">Report details</h2><p className="whitespace-pre-wrap break-words text-sm">{report.description}</p><p className="text-xs text-muted">Submitted {caseDate(report.createdAt)}</p>
      {report.firstResponseDueAt ? <p className="text-xs text-muted">First response target: {caseDate(report.firstResponseDueAt)}</p> : null}
      {report.outcome ? <p className="font-bold">Outcome: {caseLabelText(report.outcome)}</p> : null}
      {report.resolvedAt ? <p className="text-xs text-muted">Resolved {caseDate(report.resolvedAt)}</p> : null}
      {report.pausesAutoCompletion ? <Alert variant="warn">Automatic completion is paused while this report is open.</Alert> : null}
    </section>
    <section className={casePanel}><h2 className="font-extrabold">Your evidence</h2><EvidenceList items={report.evidence} /></section>
    {report.errandId ? <Link href={`/report?targetType=ERRAND&targetId=${report.errandId}`} className="text-sm font-bold text-green-800 underline">Report another concern about this errand</Link> : null}
    <p className="text-xs text-muted">Non-payment reports concern conduct. Urgent.ng does not collect or hold payments between parties.</p>
  </main>;
}
