'use client';

import { useApiMutation } from '@/lib/query/mutations';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, PhoneCall } from 'lucide-react';
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '@urgent/ui';
import { PageHead } from '@/components/shell/page-head';
import { refreshCaseViews, safetyApi, safetyKeys, type CreateReport, type EvidenceItem } from '../api';
import { CaseError, caseLabelText, casePanel } from '../case-ui';
import { EvidenceEditor } from '../evidence-editor';
import { ReportDetailPage } from './reports-page';

const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const TARGETS = ['USER', 'ERRAND', 'MESSAGE', 'RATING'] as const;
const REASONS = ['USER_BEHAVIOR', 'ERRAND', 'NON_PAYMENT', 'OVERCHARGING', 'LOST_ITEM', 'DAMAGED_ITEM', 'ABUSE', 'HARASSMENT', 'FRAUD', 'UNSAFE_BEHAVIOR', 'PROHIBITED_ITEM', 'SPAM', 'FAKE_ACCOUNT', 'OTHER'] as const;
const labelClass = 'text-xs font-bold text-ink-2';

export function ReportPage({ targetType: initialType, targetId: initialId = '', assignmentId: initialAssignment = '' }: { targetType?: string; targetId?: string; assignmentId?: string }) {
  const client = useQueryClient();
  const [targetType, setTargetType] = useState<CreateReport['targetType']>(() => initialType === 'ERRAND' || initialType === 'MESSAGE' || initialType === 'RATING' ? initialType : 'USER');
  const [targetId, setTargetId] = useState(initialId);
  // A report opened from a message, profile or assignment already knows what it is about.
  const [editReference, setEditReference] = useState(() => !new RegExp(`^${UUID}$`).test(initialId));
  const [assignmentId, setAssignmentId] = useState(initialAssignment);
  const [type, setType] = useState<CreateReport['type']>('USER_BEHAVIOR');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const intent = useRef<{ body: string; key: string } | null>(null);
  const mutation = useApiMutation({ affects: [],
    mutationFn: (body: CreateReport) => {
      const signature = JSON.stringify(body);
      if (intent.current?.body !== signature) intent.current = { body: signature, key: crypto.randomUUID() };
      return safetyApi.createReport(body, intent.current.key);
    },
    onSuccess: async result => { client.setQueryData(safetyKeys.report(result.id), result); await refreshCaseViews(client); },
  });
  if (mutation.data) return <ReportDetailPage reportId={mutation.data.id} />;

  const submit = () => {
    if (mutation.isPending || !description.trim()) return;
    mutation.mutate({
      targetType,
      targetId: targetId.trim(),
      type,
      description: description.trim(),
      ...(targetType === 'USER' && assignmentId ? { assignmentId: assignmentId.trim() } : {}),
      ...(evidence.length && targetType !== 'RATING' ? { evidence } : {}),
    });
  };

  return <main className="grid min-w-0 content-start gap-4 pb-10">
    <Link href="/safety" className="inline-flex w-fit items-center gap-2 text-xs font-bold text-green-900 hover:underline"><ArrowLeft aria-hidden="true" className="size-4" />Safety &amp; support</Link>
    <PageHead eyebrow="Safety & support" title="Report a concern" description="Tell the safety team what happened. We review every report and tell you the outcome." />
    <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
      <form className={`${casePanel} gap-5`} onSubmit={event => { event.preventDefault(); submit(); }}>
        <fieldset disabled={mutation.isPending} className="grid min-w-0 gap-5">
          <legend className="sr-only">Report details</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid min-w-0 content-start gap-1.5">
              <label className={labelClass} htmlFor="report-target-type">What are you reporting?</label>
              <Select value={targetType} onValueChange={value => { setTargetType(value as CreateReport['targetType']); setTargetId(''); setEvidence([]); setEditReference(true); }}>
                <SelectTrigger id="report-target-type"><SelectValue /></SelectTrigger>
                <SelectContent>{TARGETS.map(value => <SelectItem key={value} value={value}>{caseLabelText(value)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid min-w-0 content-start gap-1.5">
              <label className={labelClass} htmlFor="report-reason">Reason</label>
              <Select value={type} onValueChange={value => setType(value as CreateReport['type'])}>
                <SelectTrigger id="report-reason"><SelectValue /></SelectTrigger>
                <SelectContent>{REASONS.map(value => <SelectItem key={value} value={value}>{caseLabelText(value)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {editReference ? (
            <div className="grid gap-1.5">
              <label className={labelClass} htmlFor="report-reference">{caseLabelText(targetType)} reference</label>
              <Input id="report-reference" required pattern={UUID} value={targetId} onChange={event => setTargetId(event.target.value)} placeholder="Paste the reference" autoComplete="off" />
              <p className="text-xs text-muted">Reports opened from a profile, rating, message or assignment fill this in for you.</p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--r)] bg-tint px-4 py-3">
              <p className="min-w-0 text-sm text-green-900">Reporting a <b className="font-extrabold">{caseLabelText(targetType).toLowerCase()}</b> <span className="text-xs text-muted">· ref ending {targetId.slice(-6)}</span></p>
              <button type="button" onClick={() => setEditReference(true)} className="text-xs font-bold text-green-900 underline">Change</button>
            </div>
          )}

          {targetType === 'USER' ? (
            <div className="grid gap-1.5">
              <label className={labelClass} htmlFor="report-assignment">Assignment reference <span className="font-normal text-muted">(optional)</span></label>
              <Input id="report-assignment" pattern={UUID} value={assignmentId} onChange={event => setAssignmentId(event.target.value)} autoComplete="off" />
              <p className="text-xs text-muted">Include it when this report is about your work together.</p>
            </div>
          ) : null}

          <div className="grid gap-1.5">
            <label className={labelClass} htmlFor="report-details">Report details</label>
            <Textarea id="report-details" required maxLength={2000} rows={5} value={description} onChange={event => setDescription(event.target.value)} placeholder="Describe what happened and when." />
            <p className="text-right text-xs text-muted">{description.length}/2000</p>
          </div>

          {targetType !== 'RATING' ? <EvidenceEditor value={evidence} onChange={setEvidence} assignmentId={targetType === 'USER' ? assignmentId || undefined : undefined} /> : null}
          {mutation.error ? <CaseError error={mutation.error} /> : null}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-2 pt-4">
            <Link href="/reports" className="text-sm font-bold text-green-900 underline">View your reports</Link>
            <Button type="submit" disabled={!targetId.trim() || !description.trim() || mutation.isPending}>{mutation.isPending ? 'Sending…' : 'Send report'}</Button>
          </div>
        </fieldset>
      </form>

      <aside aria-label="Before you report" className={`${casePanel} content-start lg:sticky lg:top-6`}>
        <div className="flex items-start gap-3 rounded-[var(--r)] bg-red-bg p-3.5">
          <PhoneCall aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-red" />
          <p className="text-xs leading-relaxed text-red"><b className="font-extrabold">In immediate danger?</b> Call local emergency services first, then report here.</p>
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-ink">What happens next</h2>
          <ul className="mt-2 grid gap-2 text-xs leading-relaxed text-muted">
            <li>The safety team reviews your report and may contact the people involved.</li>
            <li>You are notified of the outcome.</li>
            <li>Urgent.ng does not collect, hold or settle payments.</li>
          </ul>
        </div>
        <p className="rounded-[var(--r-sm)] bg-panel p-3 text-xs leading-relaxed text-muted">Never include passwords, OTPs or full card details in a report.</p>
      </aside>
    </div>
  </main>;
}
