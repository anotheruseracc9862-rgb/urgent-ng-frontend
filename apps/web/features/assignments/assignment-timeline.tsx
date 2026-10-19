'use client';

import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { api, isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { ExecutionEvent } from '@/features/offers/api';

function label(value: string) {
  return value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ApiErrorAlert({ error, fallback, onRetry }: { error: unknown; fallback: string; onRetry?: () => void }) {
  return (
    <Alert variant="danger" role="alert">
      <p>{isApiError(error) ? error.message : fallback}</p>
      {isApiError(error) && error.requestId ? <p className="mt-1 text-xs">Request ID: {error.requestId}</p> : null}
      {onRetry ? <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={onRetry}>Try again</Button> : null}
    </Alert>
  );
}

export function AssignmentPhoto({ mediaId, alt }: { mediaId: string; alt: string }) {
  const image = useQuery({
    queryKey: queryKeys.media.url(mediaId),
    queryFn: () => api<components['schemas']['MediaUrlDto']>(`/media/${mediaId}/url`),
    staleTime: 4 * 60_000,
    retry: false,
  });
  if (image.error) {
    return <ApiErrorAlert error={image.error} fallback="We could not load this photo." onRetry={() => void image.refetch()} />;
  }
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl bg-panel">
      {image.data?.url ? <a href={image.data.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${alt.toLowerCase()}`}><Image src={image.data.url} alt={alt} fill unoptimized sizes="(max-width: 768px) 40vw, 200px" className="object-contain" /></a> : <Skeleton className="size-full" aria-label="Loading photo" />}
    </div>
  );
}

export function AssignmentTimeline({ events, title = 'Timeline' }: { events: ExecutionEvent[]; title?: string }) {
  return (
    <section className="grid gap-3 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
      <h2 className="font-extrabold text-ink">{title}</h2>
      {events.length ? (
        <ol className="grid gap-3">
          {events.map((event) => <li key={event.id} className="border-l-2 border-lime-600 pl-3">
            <p className="font-bold text-ink">{label(event.type)}</p>
            {event.note ? <p className="text-sm text-ink-2">{event.note}</p> : null}
            {event.mediaId ? <div className="my-2 max-w-48"><AssignmentPhoto mediaId={event.mediaId} alt={`${label(event.type)} evidence`} /></div> : null}
            <time className="text-xs text-muted" dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })} (Lagos time)</time>
          </li>)}
        </ol>
      ) : <p className="text-sm text-muted">No timeline events yet.</p>}
    </section>
  );
}
