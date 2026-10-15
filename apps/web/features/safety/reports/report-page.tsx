'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@urgent/ui';
import { refreshCaseViews, safetyApi, safetyKeys, type CreateReport, type EvidenceItem } from '../api';
import { CaseError, caseInput, caseLabel, caseLabelText, casePanel } from '../case-ui';
import { EvidenceEditor } from '../evidence-editor';
import { ReportDetailPage } from './reports-page';

export function ReportPage({ targetType: initialType, targetId: initialId = '', assignmentId: initialAssignment = '' }: { targetType?: string; targetId?: string; assignmentId?: string }) {
  const client = useQueryClient();
  const [targetType, setTargetType] = useState<CreateReport['targetType']>(() => initialType === 'ERRAND' || initialType === 'MESSAGE' || initialType === 'RATING' ? initialType : 'USER');
  const [targetId, setTargetId] = useState(initialId);
  const [assignmentId, setAssignmentId] = useState(initialAssignment);
  const [type, setType] = useState<CreateReport['type']>('USER_BEHAVIOR');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const intent = useRef<{ body: string; key: string } | null>(null);
  const mutation = useMutation({
    mutationFn: (body: CreateReport) => {
      const signature = JSON.stringify(body);
      if (intent.current?.body !== signature) intent.current = { body: signature, key: crypto.randomUUID() };
      return safetyApi.createReport(body, intent.current.key);
    },
    onSuccess: async result => { client.setQueryData(safetyKeys.report(result.id), result); await refreshCaseViews(client); },
  });
  if (mutation.data) return <ReportDetailPage reportId={mutation.data.id} />;
  return <main className="mx-auto grid max-w-3xl gap-5">
    <Link href="/safety" className="text-sm font-bold text-green-800">← Safety & support</Link>
    <header><h1 className="text-3xl font-extrabold">Report a concern</h1><p className="mt-2 text-sm text-muted">Tell the safety team what happened. Never include passwords, OTPs or full card details. For immediate danger, call local emergency services first.</p></header>
    <form className={casePanel} onSubmit={event => { event.preventDefault(); if (!mutation.isPending && description.trim()) mutation.mutate({ targetType, targetId: targetId.trim(), type, description: description.trim(), ...(targetType === 'USER' && assignmentId ? { assignmentId: assignmentId.trim() } : {}), ...(evidence.length && targetType !== 'RATING' ? { evidence } : {}) }); }}>
      <fieldset disabled={mutation.isPending} className="grid min-w-0 gap-4">
        <label className={caseLabel}>What are you reporting?<select className={caseInput} value={targetType} onChange={event => { setTargetType(event.target.value as CreateReport['targetType']); setTargetId(''); setEvidence([]); }}>{(['USER', 'ERRAND', 'MESSAGE', 'RATING'] as const).map(value => <option key={value} value={value}>{caseLabelText(value)}</option>)}</select></label>
        <label className={caseLabel}>{caseLabelText(targetType)} reference<input className={caseInput} required pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}" value={targetId} onChange={event => setTargetId(event.target.value)} /><span className="text-xs font-normal text-muted">Reports opened from a profile, rating or assignment fill this in for you.</span></label>
        {targetType === 'USER' ? <label className={caseLabel}>Assignment reference (optional)<input className={caseInput} pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}" value={assignmentId} onChange={event => setAssignmentId(event.target.value)} /><span className="text-xs font-normal text-muted">Include it when this report is about your work together.</span></label> : null}
        <label className={caseLabel}>Reason<select className={caseInput} value={type} onChange={event => setType(event.target.value as CreateReport['type'])}>{(['USER_BEHAVIOR', 'ERRAND', 'NON_PAYMENT', 'OVERCHARGING', 'LOST_ITEM', 'DAMAGED_ITEM', 'ABUSE', 'HARASSMENT', 'FRAUD', 'UNSAFE_BEHAVIOR', 'PROHIBITED_ITEM', 'SPAM', 'FAKE_ACCOUNT', 'OTHER'] as const).map(value => <option key={value} value={value}>{caseLabelText(value)}</option>)}</select></label>
        <label className={caseLabel}>Report details<textarea className={caseInput} required maxLength={2000} rows={5} value={description} onChange={event => setDescription(event.target.value)} /><span className="text-xs font-normal text-muted">{description.length}/2000</span></label>
        {targetType !== 'RATING' ? <EvidenceEditor value={evidence} onChange={setEvidence} assignmentId={targetType === 'USER' ? assignmentId || undefined : undefined} /> : null}
        {mutation.error ? <CaseError error={mutation.error} /> : null}
        <Button type="submit" disabled={!targetId.trim() || !description.trim() || mutation.isPending}>{mutation.isPending ? 'Sending…' : 'Send report'}</Button>
      </fieldset>
    </form>
    <Link href="/reports" className="text-sm font-bold text-green-800 underline">View your reports</Link>
  </main>;
}
