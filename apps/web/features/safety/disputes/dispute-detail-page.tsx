'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { refreshCaseViews, safetyApi, safetyKeys, type EvidenceItem } from '../api';
import { caseDate, CaseError, caseLabelText, casePanel } from '../case-ui';
import { EvidenceEditor } from '../evidence-editor';
import { EvidenceList } from '../evidence-list';

export function DisputeDetailPage({ disputeId }: { disputeId: string }) {
  const client = useQueryClient();
  const key = safetyKeys.dispute(disputeId);
  const query = useQuery({ queryKey: key, queryFn: () => safetyApi.dispute(disputeId), retry: false, refetchInterval: 30_000 });
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const mutation = useMutation({
    mutationFn: (item: EvidenceItem) => safetyApi.addEvidence(disputeId, item),
    onSuccess: async result => { client.setQueryData(key, result); setEvidence([]); await refreshCaseViews(client); },
    onError: async () => { await query.refetch(); },
  });
  if (query.isPending) return <Skeleton className="mx-auto h-64 max-w-4xl rounded-[var(--r-lg)]" />;
  if (query.error || !query.data) return <CaseError error={query.error} retry={() => void query.refetch()} />;
  const data = query.data;
  return <main className="mx-auto grid max-w-4xl gap-5">
    <Link href={`/assignments/${data.assignmentId}`} className="text-sm font-bold text-green-800">← Back to assignment</Link>
    <header><p className="text-xs font-extrabold uppercase tracking-wide text-green-800">Dispute · {caseLabelText(data.status)}</p><h1 className="mt-1 text-3xl font-extrabold">{caseLabelText(data.type)}</h1><p className="mt-2 break-all text-xs text-muted">Case reference: {data.id}</p></header>
    <Alert variant={data.canAddEvidence ? 'warn' : 'info'} role="status">{data.canAddEvidence ? 'This errand is disputed. Automatic completion is paused while the team reviews it.' : 'This case is closed to new evidence. Check the resolution and assignment for the outcome.'}</Alert>
    <section className={casePanel}><h2 className="font-extrabold">The claim</h2><p className="whitespace-pre-wrap break-words text-sm">{data.claim}</p><p className="text-xs text-muted">Opened {caseDate(data.createdAt)} · {data.openedByMe ? 'By you' : 'By the other party'}</p>
      {data.firstResponseDueAt ? <p className="text-xs text-muted">First response target: {caseDate(data.firstResponseDueAt)}</p> : null}
      {data.resolutionDueAt ? <p className="text-xs text-muted">Resolution target: {caseDate(data.resolutionDueAt)}</p> : null}
      {data.resolution ? <p className="font-bold">Resolution: {caseLabelText(data.resolution)}</p> : null}
      {data.resolutionNotes ? <p className="whitespace-pre-wrap break-words text-sm">{data.resolutionNotes}</p> : null}
      {data.resolvedAt ? <p className="text-xs text-muted">Resolved {caseDate(data.resolvedAt)}</p> : null}
    </section>
    <section className={casePanel}><h2 className="font-extrabold">Evidence from both parties</h2><EvidenceList items={data.evidence} /></section>
    {mutation.error ? <CaseError error={mutation.error} /> : null}
    {data.canAddEvidence ? <form className={casePanel} onSubmit={event => { event.preventDefault(); if (evidence[0] && !mutation.isPending) mutation.mutate(evidence[0]); }}>
      <h2 className="font-extrabold">Add your side</h2><p className="text-sm text-muted">Send one item at a time. The team can see both parties’ evidence.</p>
      <EvidenceEditor key={data.evidence.length} value={evidence} onChange={items => setEvidence(items.slice(-1))} assignmentId={data.assignmentId} disabled={mutation.isPending} />
      <Button type="submit" disabled={evidence.length !== 1 || mutation.isPending}>{mutation.isPending ? 'Adding…' : 'Send evidence'}</Button>
    </form> : null}
    <Link href={`/disputes/${data.id}`} className="text-xs text-green-800 underline">Permanent case link</Link>
  </main>;
}
