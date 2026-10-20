'use client';

import { ProBadge, isProBadge } from '@/components/runner/pro-badge';
import { PageLoading } from '@/components/shell/page-loading';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useApiMutation } from '@/lib/query/mutations';
import { Flag, Star, UserRound } from 'lucide-react';
import { Alert, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Skeleton, Textarea } from '@urgent/ui';
import { formatDate } from '@urgent/utils';
import type { components } from '@urgent/api-client';
import type { ProfileRating, PublicProfile } from '@/lib/api/types';
import { authApi } from '@/lib/api/auth';
import { api, isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { BlockUserButton } from '@/features/blocks/block-user-button';

type RatingFigure = components['schemas']['RatingFigureDto'];
type ReportType = components['schemas']['CreateReportDto']['type'];
const REPORT_TYPES: Array<{ value: ReportType; label: string }> = [
  { value: 'USER_BEHAVIOR', label: 'Inappropriate behaviour' },
  { value: 'HARASSMENT', label: 'Harassment' },
  { value: 'FRAUD', label: 'Fraud' },
  { value: 'UNSAFE_BEHAVIOR', label: 'Unsafe behaviour' },
  { value: 'SPAM', label: 'Spam' },
  { value: 'FAKE_ACCOUNT', label: 'Fake account' },
  { value: 'OTHER', label: 'Other' },
];

function displayName(profile: PublicProfile) {
  return profile.firstName === 'Deleted' ? 'Deleted User' : `${profile.firstName} ${profile.lastInitial}.`;
}

function RatingSummary({ title, figure }: { title: string; figure: RatingFigure }) {
  return (
    <article aria-label={`${title} summary`} className="rounded-[var(--r)] border border-line bg-surface p-4">
      <p className="text-xs font-bold text-muted">{title}</p>
      {figure.count < 3 || figure.average === null ? (
        <p className="mt-2 text-sm font-extrabold text-ink">{figure.count} {figure.count === 1 ? 'rating' : 'ratings'}</p>
      ) : (
        <p className="mt-2 flex items-center gap-2 text-2xl font-extrabold text-ink">
          <Star className="size-5 fill-lime text-green-800" aria-hidden="true" />{figure.average.toFixed(1)}
          <span className="text-xs font-semibold text-muted">{figure.count} reviews</span>
        </p>
      )}
      {figure.count < 3 ? <p className="mt-1 text-xs text-muted">Not enough ratings yet to show an average.</p> : null}
    </article>
  );
}

function ReviewCard({ review }: { review: ProfileRating }) {
  const stars = review.scores.overall;
  return (
    <article className="flex gap-3 border-b border-line py-4 last:border-0">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-panel text-xs font-extrabold text-ink">
        {(review.raterFirstName.charAt(0) + review.raterLastInitial).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-sm font-extrabold text-ink">{review.raterFirstName} {review.raterLastInitial}.</h3>
          {stars !== null ? <span className="text-xs font-bold text-green-800" aria-label={`${stars} out of 5 stars`}>{'★'.repeat(stars)}<span className="text-line">{'★'.repeat(5 - stars)}</span></span> : null}
        </div>
        <p className="mt-1 text-xs text-muted">{formatDate(review.createdAt, 'short')}</p>
        {review.review ? <p className="mt-2 break-words text-sm leading-relaxed text-ink-2">“{review.review}”</p> : null}
      </div>
    </article>
  );
}

function ReportProfileDialog({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ReportType>('USER_BEHAVIOR');
  const [description, setDescription] = useState('');
  const [requestKey, setRequestKey] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const mutation = useApiMutation({
    // A report is private to the reporter and changes nothing this app caches.
    affects: [],
    mutationFn: ({ reportType, details, idempotencyKey }: { reportType: ReportType; details: string; idempotencyKey: string }) =>
      authApi.createReport({ targetType: 'USER', targetId: userId, type: reportType, description: details }, idempotencyKey),
    onSuccess: () => {
      setOpen(false);
      setDescription('');
      setRequestKey('');
      setSubmitted(true);
    },
  });

  const submit = () => {
    if (!description.trim()) return;
    const idempotencyKey = requestKey || crypto.randomUUID();
    setRequestKey(idempotencyKey);
    mutation.mutate({ reportType: type, details: description.trim(), idempotencyKey });
  };

  return (
    <>
      <Button type="button" variant="soft" className="w-full" onClick={() => { mutation.reset(); setOpen(true); }}>
        <Flag aria-hidden="true" /> Report this person
      </Button>
      {submitted ? <p className="text-xs font-bold text-green-800" role="status">Report sent to our safety team.</p> : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report {name}</DialogTitle>
            <DialogDescription>Tell our safety team what happened. Your report is private.</DialogDescription>
          </DialogHeader>
          <label className="grid gap-2 text-sm font-bold text-ink">
            Reason
            <select className="min-h-11 rounded-[var(--r)] border border-line bg-surface px-3 text-sm" value={type} onChange={(event) => setType(event.target.value as ReportType)}>
              {REPORT_TYPES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-ink" htmlFor="profile-report-description">
            Details
            <Textarea id="profile-report-description" aria-label="Report details" value={description} maxLength={2000} required onChange={(event) => setDescription(event.target.value)} />
            <span className="text-right text-xs font-normal text-muted">{description.length}/2000</span>
          </label>
          {mutation.error ? (
            <Alert variant="danger" role="alert">
              <p>{isApiError(mutation.error) && mutation.error.code === 'RESOURCE_NOT_FOUND' ? 'This profile is no longer available.' : 'We could not submit this report. Please try again.'}</p>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={mutation.isPending} onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" disabled={mutation.isPending || description.trim().length === 0} onClick={submit}>{mutation.isPending ? 'Sending…' : 'Send report'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProfileLoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const notFound = isApiError(error) && error.code === 'RESOURCE_NOT_FOUND';
  return (
    <Alert variant="danger" role="alert">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p>{notFound ? 'This profile is unavailable. It may have been deleted or cannot be viewed.' : 'We could not load this profile.'}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onRetry}>Try again</Button>
      </div>
    </Alert>
  );
}

export function PublicProfilePage({ userId }: { userId: string }) {
  const profile = useQuery({
    queryKey: queryKeys.users.profile(userId),
    queryFn: authApi.publicProfile.bind(null, userId),
  });
  const photo = useQuery({
    queryKey: queryKeys.media.url(profile.data?.photoMediaId ?? ''),
    queryFn: () => api<components['schemas']['MediaUrlDto']>(`/media/${profile.data?.photoMediaId}/url`),
    enabled: profile.data?.photoMediaId !== null && profile.data?.photoMediaId !== undefined,
    staleTime: 4 * 60_000,
  });
  const reviews = useInfiniteQuery({
    queryKey: queryKeys.users.ratings(userId),
    queryFn: ({ pageParam }) => authApi.profileRatingsPage(userId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.meta?.hasNextPage ? page.meta.nextCursor ?? undefined : undefined,
    enabled: Boolean(profile.data),
  });
  const reviewItems = reviews.data?.pages.flatMap((page) => page.data) ?? [];

  if (profile.isPending) {
    return <PageLoading title="Profile" eyebrow="Urgent.ng" width="max-w-4xl" />;
  }
  if (profile.error || !profile.data) return <div className="mx-auto max-w-3xl"><ProfileLoadError error={profile.error} onRetry={() => void profile.refetch()} /></div>;

  const person = profile.data;
  const name = displayName(person);
  const initials = person.firstName === 'Deleted' ? 'DU' : `${person.firstName.charAt(0)}${person.lastInitial}`.toUpperCase();
  const isDeletedName = name === 'Deleted User';
  const badgeLabel = (badge: string) => badge.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  return (
    <div className="mx-auto grid max-w-5xl gap-5">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-wider text-green-700">Community profile</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">{name}</h1>
        <p className="mt-1 text-sm text-muted">Reputation, completed errands and recent reviews. Contact details are not shown here.</p>
      </header>
      <section className="rounded-[var(--r-lg)] border border-line bg-tint p-5 shadow-[var(--shadow)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-ink text-2xl font-extrabold text-lime">
            {!isDeletedName && photo.data?.url ? <Image src={photo.data.url} alt={`${name} profile photo`} fill unoptimized sizes="80px" className="object-cover" /> : <span className="inline-flex items-center gap-1"><UserRound className="size-5" aria-hidden="true" />{initials}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-xl font-extrabold text-ink">{name}</h2>
            <p className="mt-1 text-sm text-muted">Member since {formatDate(person.memberSince, 'short')}</p>
            {person.bio && !isDeletedName ? <p className="mt-3 max-w-2xl whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-2">{person.bio}</p> : null}
            {person.badges.length ? (
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Badges">
                {person.badges.map((badge) => isProBadge(badge) ? <li key={badge}><ProBadge className="px-3 py-1 text-xs" /></li> : <li className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-green-900" key={badge}>{badgeLabel(badge)}</li>)}
              </ul>
            ) : null}
          </div>
          {!isDeletedName ? (
            <div className="grid w-full gap-2 sm:w-auto sm:min-w-44">
              <ReportProfileDialog userId={person.id} name={name} />
              <BlockUserButton userId={person.id} userName={name} />
              <Link href="/settings/blocked" className="text-center text-xs font-bold text-green-800 underline">Manage blocked people</Link>
            </div>
          ) : null}
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2" aria-label="Completed errands and ratings">
        <article className="rounded-[var(--r)] border border-line bg-surface p-4">
          <p className="text-xs font-bold text-muted">Completed errands</p>
          <p className="mt-2 text-2xl font-extrabold text-ink">{person.stats.completedAsRunner + person.stats.completedAsRequester}</p>
          <p className="mt-1 text-xs text-muted">{person.stats.completedAsRunner} as runner · {person.stats.completedAsRequester} as requester</p>
        </article>
        <RatingSummary title="Runner rating" figure={person.stats.runnerRating} />
        <RatingSummary title="Requester rating" figure={person.stats.requesterRating} />
      </section>
      <section className="rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-5">
        <header className="border-b border-line pb-3">
          <h2 className="text-base font-extrabold text-ink">Recent reviews</h2>
          <p className="mt-1 text-xs text-muted">Published reviews from completed errands.</p>
        </header>
        {reviews.isLoading ? <div className="grid gap-3 py-4"><Skeleton className="h-16" /><Skeleton className="h-16" /></div> : null}
        {reviews.error ? (
          <div className="py-4">
            <ProfileLoadError error={reviews.error} onRetry={() => void reviews.refetch()} />
          </div>
        ) : null}
        {!reviews.isLoading && !reviews.error && reviewItems.length === 0 ? <p className="py-6 text-sm text-muted">No published reviews yet.</p> : null}
        {reviewItems.map((review) => <ReviewCard key={review.id} review={review} />)}
        {reviews.hasNextPage ? (
          <div className="pt-4">
            <Button type="button" variant="ghost" size="sm" disabled={reviews.isFetchingNextPage} onClick={() => void reviews.fetchNextPage()}>
              {reviews.isFetchingNextPage ? 'Loading…' : 'Load more reviews'}
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
