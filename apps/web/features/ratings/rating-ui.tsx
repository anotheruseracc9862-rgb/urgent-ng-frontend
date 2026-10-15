'use client';

import Link from 'next/link';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { isApiError } from '@/lib/api/client';
import type { Rating } from './api';

export const panel = 'rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-6';
export const dimensions = [
  ['overall', 'Overall'], ['reliability', 'Reliability'], ['communication', 'Communication'],
  ['timeliness', 'Timeliness'], ['paymentConduct', 'Payment conduct'],
] as const;

export function reasonText(reason: unknown): string {
  switch (reason) {
    case 'NOT_COMPLETED': return 'You can rate once this errand is completed.';
    case 'WINDOW_CLOSED': return 'The rating window has closed. You can no longer submit a rating.';
    case 'EDIT_WINDOW_CLOSED': return 'The edit window has closed. Your rating can no longer be changed.';
    case 'REVEALED': return 'This rating has been revealed and can no longer be changed.';
    case 'MODERATED': return 'This rating is being moderated and cannot be changed.';
    case 'ALREADY_RATED': return 'You have already rated this errand.';
    default: return 'Rating is not available for this errand right now.';
  }
}

export function RatingError({ error, retry }: { error: unknown; retry?: () => void }) {
  const known = isApiError(error);
  const text = known && error.code === 'RATING_NOT_ELIGIBLE' ? reasonText(error.details.reason)
    : known && error.code === 'RATING_ALREADY_SUBMITTED' ? 'You have already submitted a rating. Refresh to see the existing rating.'
    : known && error.status === 403 ? 'You do not have permission to view or change these ratings.'
    : known && error.status === 404 ? 'This assignment or rating could not be found.'
    : 'We could not load or save your ratings. Please try again.';
  return <Alert variant="danger" role="alert"><p>{text}</p>
    {known && error.requestId ? <p className="mt-1 text-xs">Request ID: {error.requestId}</p> : null}
    {retry ? <Button type="button" variant="ghost" size="sm" onClick={retry}>Try again</Button> : null}
  </Alert>;
}

export function RatingsLoading() {
  return <div aria-label="Loading ratings" className="grid gap-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 rounded-[var(--r-lg)]" /></div>;
}

export function ReportRating({ id }: { id: string }) {
  return <Link className="text-sm font-bold text-green-800 underline" href={`/report?targetType=RATING&targetId=${encodeURIComponent(id)}`}>Report rating</Link>;
}

export function RatingContent({ rating }: { rating: Pick<Rating, 'scores' | 'review'> }) {
  return <div className="grid gap-3">
    <p className="text-lg font-extrabold text-green-800">★ {rating.scores.overall ?? '—'} <span className="text-sm font-normal text-muted">/ 5 overall</span></p>
    <dl className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">{dimensions.slice(1).map(([key, label]) => rating.scores[key] != null
      ? <div key={key}><dt className="inline">{label}: </dt><dd className="inline font-bold text-ink">{rating.scores[key]}/5</dd></div> : null)}</dl>
    {rating.review ? <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{rating.review}</p> : null}
  </div>;
}
