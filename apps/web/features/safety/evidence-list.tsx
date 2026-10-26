'use client';

import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { Evidence } from './api';
import { caseDate, CaseError, caseLabelText } from './case-ui';

function EvidencePhoto({ id }: { id: string }) {
  const photo = useQuery({ queryKey: queryKeys.media.url(id), queryFn: () => api<components['schemas']['MediaUrlDto']>(`/media/${id}/url`), retry: false, staleTime: 240_000 });
  if (photo.error) return <CaseError error={photo.error} retry={() => void photo.refetch()} />;
  return photo.data ? <a href={photo.data.url} target="_blank" rel="noopener noreferrer" className="block"><Image src={photo.data.url} alt="Case evidence" width={240} height={240} unoptimized className="max-h-60 max-w-full rounded-xl object-contain" /></a> : <p role="status" className="text-xs text-muted">Loading evidence photo…</p>;
}

export function EvidenceList({ items }: { items: Evidence[] }) {
  return items.length ? <ul className="grid gap-3">{items.map(item => <li key={item.id} className="grid gap-2 rounded-xl bg-panel p-3">
    <p className="text-sm font-bold">{caseLabelText(item.sourceType)} · {item.addedByMe ? 'Added by you' : 'Added by the other party'}</p>
    {item.statement ? <p className="whitespace-pre-wrap break-words text-sm">{item.statement}</p> : null}
    {item.sourceType === 'MEDIA' && item.sourceId ? <EvidencePhoto id={item.sourceId} /> : item.sourceId ? <p className="break-all text-xs text-muted">Reference: {item.sourceId}</p> : null}
    <time className="text-xs text-muted" dateTime={item.createdAt}>{caseDate(item.createdAt)}</time>
  </li>)}</ul> : <p className="text-sm text-muted">No evidence attached.</p>;
}
