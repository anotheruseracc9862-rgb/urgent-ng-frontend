'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@urgent/ui';
import { MediaUpload } from '@/components/media-upload/media-upload';
import { offersApi } from '@/features/offers/api';
import { queryKeys } from '@/lib/query/keys';
import { caseDate, CaseError, caseInput, caseLabel, caseLabelText } from './case-ui';
import type { EvidenceItem } from './api';

export function EvidenceEditor({ value, onChange, assignmentId, disabled = false }: {
  value: EvidenceItem[]; onChange: (items: EvidenceItem[]) => void; assignmentId?: string; disabled?: boolean;
}) {
  const [sourceType, setSourceType] = useState<EvidenceItem['sourceType']>('STATEMENT');
  const [sourceId, setSourceId] = useState('');
  const [statement, setStatement] = useState('');
  const timeline = useQuery({ queryKey: queryKeys.assignments.timeline(assignmentId ?? ''), queryFn: () => offersApi.assignmentTimeline(assignmentId!), enabled: Boolean(assignmentId) && sourceType === 'EXECUTION_EVENT', retry: false });
  const canAdd = sourceType === 'STATEMENT' ? Boolean(statement.trim()) : /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sourceId);
  return <fieldset disabled={disabled} className="grid min-w-0 gap-3 rounded-xl border border-line p-3">
    <legend className="px-1 text-sm font-extrabold">Evidence (optional)</legend>
    <p className="text-xs text-muted">Attach photos, a statement, or a reference from this errand. The server checks each reference; another errand’s evidence is not accepted.</p>
    {value.length ? <ul className="grid gap-2">{value.map((item, index) => <li key={index} className="flex min-w-0 items-start justify-between gap-2 rounded-lg bg-panel p-2 text-sm">
      <span className="min-w-0 break-words">{caseLabelText(item.sourceType)}{item.statement ? `: ${item.statement}` : item.sourceId ? ` · ${item.sourceId}` : ''}</span>
      <Button type="button" size="sm" variant="ghost" aria-label={`Remove evidence ${index + 1}`} onClick={() => onChange(value.filter((_, i) => i !== index))}>Remove</Button>
    </li>)}</ul> : <p className="text-xs text-muted">No evidence attached yet.</p>}
    {value.length < 10 ? <>
      <label className={caseLabel}>Evidence type<select className={caseInput} value={sourceType} onChange={event => { setSourceType(event.target.value as EvidenceItem['sourceType']); setSourceId(''); setStatement(''); }}>
        {(['STATEMENT', 'MEDIA', 'MESSAGE', 'EXECUTION_EVENT', 'CHECKPOINT'] as const).map(type => <option key={type} value={type}>{caseLabelText(type)}</option>)}
      </select></label>
      {sourceType === 'MEDIA' ? <MediaUpload purpose="DISPUTE_EVIDENCE" maxFiles={1} value={sourceId ? [sourceId] : []} onChange={ids => setSourceId(ids[0] ?? '')} />
        : sourceType === 'EXECUTION_EVENT' && assignmentId ? <>
          <label className={caseLabel}>Recorded step<select className={caseInput} value={sourceId} onChange={event => setSourceId(event.target.value)}><option value="">Choose a recorded step</option>{timeline.data?.map(event => <option key={event.id} value={event.id}>{caseLabelText(event.type)} · {caseDate(event.createdAt)}</option>)}</select></label>
          {timeline.isPending ? <p role="status" className="text-xs text-muted">Loading recorded steps…</p> : null}
          {timeline.error ? <CaseError error={timeline.error} retry={() => void timeline.refetch()} /> : null}
          {timeline.data?.length === 0 ? <p className="text-xs text-muted">No recorded steps are available yet.</p> : null}
        </> : sourceType !== 'STATEMENT' ? <label className={caseLabel}>{caseLabelText(sourceType)} reference<input className={caseInput} value={sourceId} onChange={event => setSourceId(event.target.value)} placeholder="UUID reference" /><span className="text-xs font-normal text-muted">Use the reference supplied with the original {sourceType === 'MESSAGE' ? 'message' : 'checkpoint'}. If you do not have it, describe it in a statement instead.</span></label> : null}
      <label className={caseLabel}>{sourceType === 'STATEMENT' ? 'Evidence statement' : 'Evidence note (optional)'}<textarea className={caseInput} rows={3} maxLength={2000} value={statement} onChange={event => setStatement(event.target.value)} /></label>
      <Button type="button" variant="ghost" className="w-fit" disabled={!canAdd} onClick={() => {
        onChange([...value, { sourceType, ...(sourceType !== 'STATEMENT' ? { sourceId } : {}), ...(statement.trim() ? { statement: statement.trim() } : {}) }]);
        setSourceId(''); setStatement('');
      }}>Attach evidence</Button>
    </> : <p className="text-xs text-muted">You have attached the maximum of 10 items.</p>}
  </fieldset>;
}
