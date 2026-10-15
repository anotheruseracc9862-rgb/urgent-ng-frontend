'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { offersApi } from '@/features/offers/api';
import { refreshCaseViews, safetyApi, safetyKeys, type EvidenceItem, type OpenDispute } from '../api';
import { caseInput, caseLabel, caseLabelText, casePanel, CaseError } from '../case-ui';
import { EvidenceEditor } from '../evidence-editor';
import { DisputeDetailPage } from './dispute-detail-page';

export function OpenDisputePage({ assignmentId }: { assignmentId: string }) {
  const client = useQueryClient();
  const assignment = useQuery({ queryKey: queryKeys.assignments.detail(assignmentId), queryFn: () => offersApi.assignment(assignmentId), retry: false });
  const [type, setType] = useState<OpenDispute['type']>('ITEM_NOT_DELIVERED');
  const [claim, setClaim] = useState('');
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const intent = useRef<{ body: string; key: string } | null>(null);
  const mutation = useMutation({
    mutationFn: (body: OpenDispute) => {
      const signature = JSON.stringify(body);
      if (intent.current?.body !== signature) intent.current = { body: signature, key: crypto.randomUUID() };
      return safetyApi.openDispute(assignmentId, body, intent.current.key);
    },
    onSuccess: async dispute => {
      client.setQueryData(safetyKeys.dispute(dispute.id), dispute);
      await refreshCaseViews(client);
    },
    onError: async error => {
      if (isApiError(error) && ['ERRAND_INVALID_STATE', 'ASSIGNMENT_INVALID_STATE', 'DISPUTE_ALREADY_OPEN'].includes(error.code)) await assignment.refetch();
    },
  });
  if (mutation.data) return <DisputeDetailPage disputeId={mutation.data.id} />;
  if (assignment.isPending) return <Skeleton className="mx-auto h-64 max-w-4xl rounded-[var(--r-lg)]" />;
  if (!assignment.data || assignment.error) return <CaseError error={assignment.error} retry={() => void assignment.refetch()} />;
  const current = assignment.data.data;
  const existing = isApiError(mutation.error) && typeof mutation.error.details.disputeId === 'string' ? mutation.error.details.disputeId
    : current.errand.status === 'DISPUTED' ? current.disputeId : null;
  const allowed = current.status === 'ACCEPTED' && ['ACCEPTED', 'IN_PROGRESS', 'PICKED_UP', 'DELIVERED'].includes(current.errand.status);
  return <main className="mx-auto grid max-w-4xl gap-5">
    <Link href={`/assignments/${assignmentId}`} className="text-sm font-bold text-green-800">← Back to assignment</Link>
    <header><p className="text-xs font-extrabold uppercase tracking-wide text-green-800">Safety & support</p><h1 className="mt-1 text-3xl font-extrabold">Open a dispute</h1><p className="mt-2 text-sm text-muted">{current.errand.title}. Tell us what went wrong. Payments stay between you two.</p></header>
    {mutation.error ? <CaseError error={mutation.error} /> : null}
    {existing ? <Alert role="status">A dispute is already open. <Link className="font-bold underline" href={`/disputes/${encodeURIComponent(existing)}`}>View existing dispute</Link></Alert> : null}
    <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_18rem]">
      {allowed ? <form className={casePanel} onSubmit={event => { event.preventDefault(); if (claim.trim() && !mutation.isPending) mutation.mutate({ type, claim: claim.trim(), ...(evidence.length ? { evidence } : {}) }); }}>
        <fieldset disabled={mutation.isPending} className="grid min-w-0 gap-4">
          <label className={caseLabel}>Issue<select className={caseInput} value={type} onChange={event => setType(event.target.value as OpenDispute['type'])}>{(['ITEM_NOT_DELIVERED', 'ITEM_DAMAGED', 'ITEM_MISSING', 'WRONG_ITEM', 'UNAUTHORIZED_CHANGE', 'SAFETY_INCIDENT', 'OTHER'] as const).map(value => <option key={value} value={value}>{caseLabelText(value)}</option>)}</select></label>
          <label className={caseLabel}>What happened?<textarea className={caseInput} rows={5} maxLength={2000} required value={claim} onChange={event => setClaim(event.target.value)} placeholder="What happened, and what did you already try?" /><span className="text-xs font-normal text-muted">{claim.length}/2000</span></label>
          <EvidenceEditor assignmentId={assignmentId} value={evidence} onChange={setEvidence} />
          <Button type="submit" disabled={!claim.trim() || mutation.isPending}>{mutation.isPending ? 'Submitting…' : 'Submit dispute'}</Button>
        </fieldset>
      </form> : <section className={casePanel}>
        <h2 className="font-extrabold">{current.errand.status === 'DISPUTED' ? 'This errand is disputed' : 'Disputes are not available at this stage'}</h2>
        <p className="text-sm text-muted">{current.errand.status === 'DISPUTED' ? 'Automatic completion is paused. Use the existing dispute link above or the case link in your notification.' : 'A dispute can be opened after acceptance and before the errand completes. You can still report a safety concern.'}</p>
      </section>}
      <aside className={casePanel}><h2 className="font-extrabold">What happens next?</h2><p className="text-sm text-muted">Opening a dispute pauses automatic completion. Both parties can add their side while the team reviews the case.</p><p className="text-sm text-muted">Urgent.ng can complete, cancel or dismiss the case. We do not collect, hold or settle payments.</p><Link href={`/report?targetType=ERRAND&targetId=${current.errandId}`} className="text-sm font-bold text-green-800 underline">Report a separate safety concern</Link></aside>
    </div>
  </main>;
}
