'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Alert, Button } from '@urgent/ui';
import { formatDate } from '@urgent/utils';
import { useSession } from '@/lib/auth/client';
import { ratingKeys, ratingsApi, type Direction } from './api';
import { panel, RatingContent, RatingError, RatingsLoading, ReportRating } from './rating-ui';

export function RatingsPage() {
  const { me } = useSession();
  const [direction, setDirection] = useState<Direction>('RECEIVED');
  const query = useInfiniteQuery({
    queryKey: ratingKeys.list(me.id, direction), initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => ratingsApi.list(direction, pageParam, signal),
    getNextPageParam: (last) => last.meta?.nextCursor ?? undefined, retry: false,
  });
  const ratings = [...new Map(query.data?.pages.flatMap((page) => page.data).map((rating) => [rating.id, rating])).values()];
  return <div className="mx-auto grid max-w-3xl gap-5">
    <header><p className="text-xs font-extrabold uppercase tracking-wider text-green-700">Reputation</p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">Reviews</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">What people said about working with you, and the reviews you left. Only people who completed an errand together can rate each other.</p></header>
    <Alert variant="info">Reviews stay private until both sides rate or the rating window closes. Reviews may be checked for safety and policy.</Alert>
    <section className={panel} aria-label="Ratings list">
      <div className="mb-5 flex gap-2" role="group" aria-label="Rating direction">{(['RECEIVED', 'GIVEN'] as const).map((value) => <Button type="button" key={value} variant={direction === value ? 'primary' : 'ghost'} aria-pressed={direction === value} onClick={() => setDirection(value)}>{value === 'RECEIVED' ? 'Received' : 'Given'}</Button>)}</div>
      {query.isPending ? <RatingsLoading /> : null}
      {query.error ? <RatingError error={query.error} retry={() => void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())} /> : null}
      {!query.isPending && !query.error && !ratings.length ? <div className="py-10 text-center"><h2 className="font-extrabold text-ink">No {direction.toLowerCase()} ratings yet</h2><p className="mt-2 text-sm text-muted">{direction === 'RECEIVED' ? 'Reviews from your completed errands will appear here after the reveal.' : 'Complete an errand, then leave a rating from its assignment page.'}</p></div> : null}
      <ul className="divide-y divide-line">{ratings.map((rating) => <li key={rating.id} className="grid gap-3 py-5 first:pt-0">
        {direction === 'RECEIVED' && !rating.revealed ? <p className="text-sm text-muted">Waiting for the reveal. This rating is still private.</p> : <>
          <div className="flex flex-wrap items-start justify-between gap-2"><h2 className="font-extrabold text-ink">{rating.counterpartFirstName} {rating.counterpartLastInitial}.</h2><time className="text-xs text-muted" dateTime={rating.createdAt}>{formatDate(rating.createdAt, 'short')}</time></div>
          <Link href={`/assignments/${encodeURIComponent(rating.assignmentId)}/rating`} className="text-sm font-bold text-green-800 hover:underline">{rating.errandTitle}</Link>
          <RatingContent rating={rating} />
          {!rating.revealed ? <p className="text-xs text-muted">Waiting for the other side. Your rating has not been revealed yet.</p> : null}
          <ReportRating id={rating.id} />
        </>}
      </li>)}</ul>
      {query.hasNextPage ? <Button type="button" variant="ghost" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>{query.isFetchingNextPage ? 'Loading…' : 'Load more ratings'}</Button> : null}
    </section>
  </div>;
}
