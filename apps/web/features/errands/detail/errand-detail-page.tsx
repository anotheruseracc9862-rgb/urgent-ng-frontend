'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  MapPin,
  Package,
  RefreshCw,
  ShieldCheck,
  Star,
  Truck,
  UserRound,
} from 'lucide-react';
import type { components } from '@urgent/api-client';
import { Alert, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Skeleton } from '@urgent/ui';
import { authApi } from '@/lib/api/auth';
import { api, isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { errandsApi, type Errand, type ErrandOffer, type OfferSort } from '../api';

type Status = components['schemas']['ErrandStatus'];
type PublicProfile = components['schemas']['PublicProfileDto'];

const STATUS_LABEL: Record<Status, string> = {
  DRAFT: 'Draft',
  OPEN: 'Open',
  RUNNER_SELECTED: 'Runner selected',
  ACCEPTED: 'Accepted',
  IN_PROGRESS: 'In progress',
  PICKED_UP: 'Picked up',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  DISPUTED: 'Disputed',
};

const STATUS_STYLE: Record<Status, string> = {
  DRAFT: 'bg-panel text-ink-2',
  OPEN: 'bg-amber-bg text-amber',
  RUNNER_SELECTED: 'bg-blue-bg text-blue',
  ACCEPTED: 'bg-blue-bg text-blue',
  IN_PROGRESS: 'bg-blue-bg text-blue',
  PICKED_UP: 'bg-blue-bg text-blue',
  DELIVERED: 'bg-green-bg text-green-800',
  COMPLETED: 'bg-green-bg text-green-800',
  CANCELLED: 'bg-red-bg text-red',
  EXPIRED: 'bg-red-bg text-red',
  DISPUTED: 'bg-amber-bg text-amber',
};

const PROGRESS_STEPS = ['Draft', 'Open', 'Runner selected', 'Accepted', 'In progress', 'Picked up', 'Delivered', 'Completed'];
const STATUS_PROGRESS: Partial<Record<Status, number>> = {
  DRAFT: 0,
  OPEN: 1,
  RUNNER_SELECTED: 2,
  ACCEPTED: 3,
  IN_PROGRESS: 4,
  PICKED_UP: 5,
  DELIVERED: 6,
  COMPLETED: 7,
  EXPIRED: 1,
};

const SORTS: Array<{ value: OfferSort; label: string }> = [
  { value: 'price_asc', label: 'Lowest price' },
  { value: 'recommended', label: 'Recommended' },
  { value: 'eta_asc', label: 'Fastest' },
  { value: 'rating_desc', label: 'Highest rated' },
  { value: 'distance_asc', label: 'Nearest area' },
];

const money = (minor: number | null) =>
  minor === null
    ? 'Not set'
    : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(minor / 100);

function dateLabel(value: string | null) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Lagos',
  }).format(new Date(value));
}

function displayName(profile: PublicProfile) {
  return profile.firstName === 'Deleted' ? 'Deleted User' : `${profile.firstName} ${profile.lastInitial}.`;
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();
}

function ApiErrorMessage({ error, fallback }: { error: unknown; fallback: string }) {
  const message = isApiError(error)
    ? error.code === 'RESOURCE_NOT_FOUND'
      ? 'This errand could not be found, or you do not have permission to view it.'
      : error.message || fallback
    : fallback;
  return (
    <Alert variant="danger" role="alert">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p>{message}</p>
          {isApiError(error) && error.requestId ? <p className="mt-1 text-xs">Request ID: {error.requestId}</p> : null}
        </div>
      </div>
    </Alert>
  );
}

function ErrandPhoto({ mediaId }: { mediaId: string }) {
  const photo = useQuery({
    queryKey: queryKeys.media.url(mediaId),
    queryFn: () => api<components['schemas']['MediaUrlDto']>(`/media/${mediaId}/url`),
    staleTime: 4 * 60_000,
  });
  return (
    <span className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-[var(--r)] bg-panel text-muted">
      {photo.data?.url ? <Image src={photo.data.url} alt="Errand photo" fill unoptimized sizes="96px" className="object-cover" /> : <Package aria-hidden="true" className="size-6" />}
    </span>
  );
}

function MediaThumbnail({ mediaId, name, size = 'size-12' }: { mediaId: string | null; name: string; size?: string }) {
  const photo = useQuery({
    queryKey: queryKeys.media.url(mediaId ?? ''),
    queryFn: () => api<components['schemas']['MediaUrlDto']>(`/media/${mediaId}/url`),
    enabled: Boolean(mediaId),
    staleTime: 4 * 60_000,
  });

  return (
    <span className={`relative grid ${size} shrink-0 place-items-center overflow-hidden rounded-full bg-ink text-sm font-extrabold text-lime`}>
      {photo.data?.url ? (
        <Image src={photo.data.url} alt={`${name} profile photo`} fill unoptimized sizes="64px" className="object-cover" />
      ) : (
        <span aria-hidden="true">{initials(name) || <UserRound className="size-5" />}</span>
      )}
    </span>
  );
}

function ErrandLocation({ title, location }: { title: string; location: Errand['pickup'] }) {
  if (!location) return null;
  const area = [...new Set([location.area, location.lga, location.state].filter(Boolean))].join(', ');
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-green-bg text-green-800"><MapPin aria-hidden="true" className="size-4" /></span>
      <div className="min-w-0">
        <p className="text-xs font-extrabold uppercase tracking-wide text-muted">{title}</p>
        <p className="mt-1 break-words text-sm font-bold text-ink">{location.addressText || location.landmark || area}</p>
        {location.addressText && location.landmark ? <p className="mt-0.5 text-sm text-ink-2">{location.landmark}</p> : null}
        <p className="mt-0.5 text-xs text-muted">{area}</p>
      </div>
    </div>
  );
}

function Contact({ label, contact }: { label: string; contact: Errand['pickupContact'] }) {
  if (!contact?.name && !contact?.phone) return null;
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-ink">
        {[contact.name, contact.phone].filter(Boolean).join(' · ')}
      </dd>
    </div>
  );
}

function Progress({ errand }: { errand: Errand }) {
  const currentStep = STATUS_PROGRESS[errand.status];
  const isStopped = errand.status === 'CANCELLED' || errand.status === 'DISPUTED';
  return (
    <section className="rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-5" aria-labelledby="errand-progress">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="errand-progress" className="text-base font-extrabold text-ink">Progress</h2>
          <p className="mt-1 text-sm text-muted">Current status: {STATUS_LABEL[errand.status]}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${STATUS_STYLE[errand.status]}`}>{STATUS_LABEL[errand.status]}</span>
      </div>
      <ol className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8" aria-label="Errand status progression">
        {PROGRESS_STEPS.map((step, index) => {
          const complete = currentStep !== undefined && index < currentStep;
          const current = currentStep === index && !isStopped;
          return (
            <li key={step} className={`flex items-center gap-2 text-xs ${complete || current ? 'font-bold text-green-900' : 'text-muted'}`}>
              <span className={`grid size-6 shrink-0 place-items-center rounded-full ${complete ? 'bg-green-800 text-white' : current ? 'bg-lime text-ink' : 'bg-panel text-muted'}`}>
                {complete ? <CheckCircle2 aria-hidden="true" className="size-4" /> : index + 1}
              </span>
              <span>{step}</span>
            </li>
          );
        })}
      </ol>
      {errand.status === 'CANCELLED' ? (
        <Alert variant="danger" className="mt-4"><span>This errand was cancelled{errand.cancellationReason ? ` (${errand.cancellationReason.toLowerCase().replaceAll('_', ' ')})` : ''}.</span></Alert>
      ) : errand.status === 'EXPIRED' ? (
        <Alert variant="info" className="mt-4"><span>This errand expired before a runner was selected. You can repost it as a new draft.</span></Alert>
      ) : errand.status === 'DISPUTED' ? (
        <Alert variant="warn" className="mt-4"><span>This errand is under review. Manage the issue from the assignment hub.</span></Alert>
      ) : null}
    </section>
  );
}

function RunnerCard({ runnerId, amountMinor }: { runnerId: string; amountMinor: number }) {
  const profileQuery = useQuery({
    queryKey: queryKeys.users.profile(runnerId),
    queryFn: () => authApi.publicProfile(runnerId),
  });

  if (profileQuery.isLoading) return <Skeleton className="h-28 rounded-[var(--r-lg)]" />;
  if (profileQuery.error || !profileQuery.data) {
    return <div className="grid gap-2"><ApiErrorMessage error={profileQuery.error} fallback="We could not load the runner profile." /><Button type="button" variant="ghost" size="sm" onClick={() => void profileQuery.refetch()}>Try again</Button></div>;
  }

  const runner = profileQuery.data;
  const name = displayName(runner);
  const rating = runner.stats.runnerRating;
  return (
    <section className="rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-5">
      <h2 className="text-base font-extrabold text-ink">Runner</h2>
      <div className="mt-4 flex items-center gap-3">
        <MediaThumbnail mediaId={runner.photoMediaId} name={name} size="size-14" />
        <div className="min-w-0 flex-1">
          <Link href={`/users/${runnerId}`} className="font-extrabold text-ink hover:underline">{name}</Link>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {rating.count >= 3 && rating.average !== null ? <span className="inline-flex items-center gap-1"><Star aria-hidden="true" className="size-3.5 fill-amber text-amber" />{rating.average.toFixed(1)}</span> : <span>New to ratings</span>}
            <span>{runner.stats.completedAsRunner} completed errands</span>
          </p>
        </div>
      </div>
      {runner.badges.length ? <ul className="mt-3 flex flex-wrap gap-2">{runner.badges.map((badge) => <li key={badge} className="rounded-full bg-green-bg px-2.5 py-1 text-xs font-bold text-green-900">{badge.toLowerCase().replaceAll('_', ' ')}</li>)}</ul> : null}
      <dl className="mt-4 border-t border-line pt-3">
        <div className="flex justify-between gap-3 text-sm"><dt className="text-muted">Agreed runner fee</dt><dd className="font-extrabold text-ink">{money(amountMinor)}</dd></div>
      </dl>
    </section>
  );
}

function OfferCard({ offer, onSelect, selecting }: { offer: ErrandOffer; onSelect: (offer: ErrandOffer) => void; selecting: boolean }) {
  const canSelect = !offer.needsReconfirmation && offer.awaitingParty !== 'RUNNER';
  return (
    <article className="grid gap-3 rounded-[var(--r)] border border-line bg-surface p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="flex min-w-0 gap-3">
        <MediaThumbnail mediaId={offer.runnerPhotoMediaId} name={offer.runnerName} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/users/${offer.runnerId}`} className="font-extrabold text-ink hover:underline">{offer.runnerName}</Link>
            {offer.runnerVerified ? <span className="inline-flex items-center gap-1 rounded-full bg-green-bg px-2 py-0.5 text-[11px] font-bold text-green-900"><ShieldCheck aria-hidden="true" className="size-3" />Verified</span> : null}
            {offer.runnerIsPro ? <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-white">Pro</span> : null}
            {offer.needsReconfirmation ? <span className="rounded-full bg-amber-bg px-2 py-0.5 text-[11px] font-bold text-amber">Reconfirmation needed</span> : null}
          </div>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            {offer.runnerRating !== null ? <span className="inline-flex items-center gap-1"><Star aria-hidden="true" className="size-3 fill-amber text-amber" />{offer.runnerRating.toFixed(1)}</span> : <span>New to ratings</span>}
            <span>{offer.runnerCompletedErrands} completed</span>
            <span>{offer.durationMinutes} min ETA</span>
            {offer.distanceBucket ? <span>{offer.distanceBucket} away</span> : null}
          </p>
          {offer.message ? <p className="mt-2 break-words text-sm text-ink-2">{offer.message}</p> : null}
          {offer.needsReconfirmation ? <p className="mt-2 text-xs font-semibold text-amber">Waiting for the runner to reconfirm after your errand edit.</p> : offer.awaitingParty === 'RUNNER' ? <p className="mt-2 text-xs text-muted">Waiting for the runner to reply to your counter.</p> : null}
          {offer.runnerBadges.length ? <ul className="mt-2 flex flex-wrap gap-1.5">{offer.runnerBadges.map((badge) => <li key={badge} className="rounded-full bg-panel px-2 py-0.5 text-[11px] font-semibold text-ink-2">{badge.toLowerCase().replaceAll('_', ' ')}</li>)}</ul> : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
        <strong className="text-lg font-extrabold text-ink">{money(offer.amountMinor)}</strong>
        <Button type="button" size="sm" disabled={!canSelect || selecting} onClick={() => onSelect(offer)}>
          {selecting ? 'Selecting…' : canSelect ? `Select · ${money(offer.amountMinor)}` : 'Waiting'}
        </Button>
      </div>
    </article>
  );
}

function timelineLabel(type: string) {
  return type.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ErrandDetailPage({ errandId }: { errandId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<OfferSort>('price_asc');
  const [offerToSelect, setOfferToSelect] = useState<ErrandOffer | null>(null);
  const errandQuery = useQuery({
    queryKey: queryKeys.errands.detail(errandId),
    queryFn: () => errandsApi.get(errandId),
  });
  const errand = errandQuery.data;
  const offersQuery = useQuery({
    queryKey: queryKeys.errands.offers(errandId, sort),
    queryFn: () => errandsApi.offers(errandId, sort),
    enabled: errand?.status === 'OPEN',
  });
  const assignment = errand?.assignment ?? null;
  const timelineQuery = useQuery({
    queryKey: queryKeys.assignments.timeline(assignment?.id ?? ''),
    queryFn: () => errandsApi.timeline(assignment!.id),
    enabled: Boolean(assignment),
  });
  const extend = useMutation({
    mutationFn: () => errandsApi.extend(errandId),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.errands.detail(errandId), updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.errands.lists() });
    },
  });
  const duplicate = useMutation({
    mutationFn: () => errandsApi.duplicate(errandId),
    onSuccess: (draft) => {
      queryClient.setQueryData(queryKeys.errands.detail(draft.id), draft);
      router.push(`/errands/${draft.id}/edit`);
    },
  });
  const selectRunner = useMutation({
    mutationFn: ({ offer, idempotencyKey }: { offer: ErrandOffer; idempotencyKey: string }) =>
      errandsApi.selectRunner(errandId, offer, idempotencyKey),
    onSuccess: (selected) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.errands.detail(errandId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.errands.offers(errandId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.errands.lists() });
      setOfferToSelect(null);
      router.push(`/assignments/${selected.id}`);
    },
    onError: (error) => {
      if (isApiError(error) && ['ASSIGNMENT_CONFLICT', 'ERRAND_EXPIRED', 'ERRAND_INVALID_STATE', 'OFFER_VERSION_MISMATCH', 'OFFER_NOT_ELIGIBLE'].includes(error.code)) {
        setOfferToSelect(null);
      }
      void errandQuery.refetch();
      void offersQuery.refetch();
    },
  });

  if (errandQuery.isLoading) {
    return <div className="mx-auto grid max-w-6xl gap-4"><Skeleton className="h-12" /><Skeleton className="h-44 rounded-[var(--r-lg)]" /><div className="grid gap-4 lg:grid-cols-[1fr_20rem]"><Skeleton className="h-80 rounded-[var(--r-lg)]" /><Skeleton className="h-48 rounded-[var(--r-lg)]" /></div></div>;
  }
  if (errandQuery.error || !errand) {
    return <div className="mx-auto max-w-4xl"><Link href="/errands" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-green-800"><ArrowLeft aria-hidden="true" className="size-4" />My errands</Link><ApiErrorMessage error={errandQuery.error} fallback="We could not load this errand." /><Button className="mt-3" type="button" variant="ghost" onClick={() => void errandQuery.refetch()}><RefreshCw aria-hidden="true" className="mr-2 size-4" />Try again</Button></div>;
  }

  const hasLocations = Boolean(errand.pickup || errand.destination);
  const canExtend = errand.status === 'OPEN' && !errand.extended;
  const showOffers = errand.status === 'OPEN';
  const actionError = extend.error ?? duplicate.error ?? selectRunner.error;
  const actionErrorMessage = isApiError(actionError)
    ? actionError.code === 'ERRAND_EXPIRED'
      ? 'This errand has expired. Repost it as a new draft instead.'
      : actionError.code === 'OFFER_VERSION_MISMATCH'
        ? 'This offer changed before selection. Refresh the offers and review the current price.'
      : actionError.code === 'ASSIGNMENT_CONFLICT'
        ? 'Another selection was completed first. The errand and its offers have been refreshed.'
      : actionError.code === 'OFFER_NOT_ELIGIBLE'
        ? 'This runner is already at capacity and cannot take another errand right now.'
      : actionError.code === 'ERRAND_INVALID_STATE'
        ? 'The errand changed before that action could finish. Refresh to see the current status and available actions.'
        : actionError.message
    : actionError instanceof Error ? actionError.message : null;
  const selectionConflict = isApiError(actionError) && ['ASSIGNMENT_CONFLICT', 'OFFER_VERSION_MISMATCH'].includes(actionError.code);

  return (
    <div className="mx-auto grid max-w-6xl gap-4">
      <Link href="/errands" className="inline-flex w-fit items-center gap-2 text-sm font-bold text-green-800 hover:underline"><ArrowLeft aria-hidden="true" className="size-4" />My errands</Link>
      <header className="flex flex-col gap-4 rounded-[var(--r-lg)] border border-line bg-tint p-4 shadow-[var(--shadow)] sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-wider text-green-800">{errand.id} · {errand.category.name}</p>
          <h1 className="mt-2 max-w-3xl break-words text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{errand.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${STATUS_STYLE[errand.status]}`}>{STATUS_LABEL[errand.status]}</span>
            <span>Posted {dateLabel(errand.publishedAt ?? errand.createdAt)}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {errand.status === 'DRAFT' ? <>
            <Button asChild><Link href={`/errands/${errandId}/edit`}>Edit draft</Link></Button>
            <Button asChild variant="ghost"><Link href={`/errands/${errandId}/review`}>Review and publish</Link></Button>
            <Button asChild variant="danger"><Link href={`/errands/${errandId}/cancel`}>Delete draft</Link></Button>
          </> : null}
          {errand.status === 'OPEN' ? <>
            <Button asChild variant="ghost"><Link href={`/errands/${errandId}/edit`}>Edit</Link></Button>
            <Button asChild variant="ghost"><Link href="/pricing#errand-boost">Boost</Link></Button>
            <Button asChild variant="danger"><Link href={`/errands/${errandId}/cancel`}>Cancel</Link></Button>
          </> : null}
          {errand.status === 'RUNNER_SELECTED' ? <Button asChild variant="danger"><Link href={`/errands/${errandId}/cancel`}>Cancel</Link></Button> : null}
          {['ACCEPTED', 'IN_PROGRESS', 'PICKED_UP', 'DELIVERED', 'COMPLETED', 'DISPUTED'].includes(errand.status) && assignment ? (
            <Button asChild><Link href={`/assignments/${assignment.id}`}>Open assignment hub<ExternalLink aria-hidden="true" className="ml-2 size-4" /></Link></Button>
          ) : null}
          {errand.status === 'EXPIRED' || errand.status === 'CANCELLED' ? (
            <Button type="button" disabled={duplicate.isPending} onClick={() => duplicate.mutate()}>{duplicate.isPending ? 'Creating draft…' : 'Repost as draft'}</Button>
          ) : null}
        </div>
      </header>

      {actionErrorMessage ? <Alert variant={selectionConflict ? 'info' : 'danger'} role={selectionConflict ? 'status' : 'alert'}><div className="flex flex-wrap items-center justify-between gap-3"><div><p>{actionErrorMessage}</p>{isApiError(actionError) && actionError.requestId ? <p className="mt-1 text-xs">Request ID: {actionError.requestId}</p> : null}</div><Button type="button" size="sm" variant="ghost" onClick={() => { extend.reset(); duplicate.reset(); selectRunner.reset(); void errandQuery.refetch(); void offersQuery.refetch(); }}>Refresh errand</Button></div></Alert> : null}

      <Progress errand={errand} />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 gap-4">
          {showOffers ? (
            <section id="offers" className="rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-5" aria-labelledby="errand-offers">
              <header className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 id="errand-offers" className="text-base font-extrabold text-ink">Offers ({errand.offerCount})</h2>
                  <p className="mt-1 text-sm text-muted">Compare runners, then choose the offer that works for you.</p>
                </div>
                <label className="grid gap-1 text-xs font-bold text-muted">
                  Sort offers
                  <select aria-label="Sort offers" value={sort} onChange={(event) => setSort(event.target.value as OfferSort)} className="min-h-10 rounded-full border border-line bg-surface px-3 text-sm text-ink">
                    {SORTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
              </header>
              {offersQuery.isLoading ? <div className="mt-4 grid gap-3"><Skeleton className="h-28 rounded-[var(--r)]" /><Skeleton className="h-28 rounded-[var(--r)]" /></div> : null}
              {offersQuery.error ? <div className="mt-4"><ApiErrorMessage error={offersQuery.error} fallback="We could not load offers." /><Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => void offersQuery.refetch()}>Try again</Button></div> : null}
              {!offersQuery.isLoading && !offersQuery.error && offersQuery.data?.length === 0 ? (
                <div className="py-8 text-center"><span className="mx-auto grid size-11 place-items-center rounded-full bg-panel text-muted"><Clock3 aria-hidden="true" className="size-5" /></span><p className="mt-3 font-bold text-ink">No offers yet</p><p className="mt-1 text-sm text-muted">Nearby runners can send offers while this errand is open.</p></div>
              ) : null}
              {offersQuery.data?.length ? <div className="mt-4 grid gap-3">{offersQuery.data.map((offer) => <OfferCard key={offer.id} offer={offer} onSelect={setOfferToSelect} selecting={selectRunner.isPending} />)}</div> : null}
            </section>
          ) : null}

          <section className="rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-5">
            <h2 className="text-base font-extrabold text-ink">Errand details</h2>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-2">{errand.description || 'No additional description.'}</p>
            {errand.instructions ? <div className="mt-4 rounded-[var(--r)] bg-panel p-3"><p className="text-xs font-extrabold uppercase tracking-wide text-muted">Instructions</p><p className="mt-1 whitespace-pre-wrap text-sm text-ink-2">{errand.instructions}</p></div> : null}
            <dl className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
              <div><dt className="text-xs font-bold text-muted">When</dt><dd className="mt-1 flex items-center gap-2 text-sm font-semibold text-ink"><CalendarClock aria-hidden="true" className="size-4 text-green-800" />{errand.timeMode === 'SCHEDULED' ? dateLabel(errand.scheduledAt) : errand.timeMode === 'ASAP' ? 'As soon as possible' : 'Not specified'}</dd></div>
              <div><dt className="text-xs font-bold text-muted">Suggested budget</dt><dd className="mt-1 text-sm font-extrabold text-ink">{money(errand.suggestedBudgetMinor)}</dd></div>
              <div><dt className="text-xs font-bold text-muted">Priority</dt><dd className="mt-1 text-sm font-semibold text-ink">{errand.priority === 'URGENT' ? 'Urgent' : 'Standard'}</dd></div>
              {errand.itemSize ? <div><dt className="text-xs font-bold text-muted">Item size</dt><dd className="mt-1 flex items-center gap-2 text-sm font-semibold text-ink"><Package aria-hidden="true" className="size-4 text-green-800" />{errand.itemSize.replaceAll('_', ' ').toLowerCase()}</dd></div> : null}
              {errand.itemValueMinor !== null ? <div><dt className="text-xs font-bold text-muted">Item value</dt><dd className="mt-1 text-sm font-semibold text-ink">{money(errand.itemValueMinor)}</dd></div> : null}
              {errand.expiresAt ? <div><dt className="text-xs font-bold text-muted">Closes</dt><dd className="mt-1 flex items-center gap-2 text-sm font-semibold text-ink"><Clock3 aria-hidden="true" className="size-4 text-green-800" />{dateLabel(errand.expiresAt)}</dd></div> : null}
            </dl>
            {hasLocations ? <div className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2"><ErrandLocation title={errand.pickup && errand.destination ? 'Pickup' : 'On-site location'} location={errand.pickup} />{errand.destination ? <ErrandLocation title="Drop-off" location={errand.destination} /> : null}</div> : null}
            {errand.pickupContact || errand.dropoffContact ? <dl className="mt-5 grid gap-3 border-t border-line pt-4 sm:grid-cols-2"><Contact label="Pickup contact" contact={errand.pickupContact} /><Contact label="Drop-off contact" contact={errand.dropoffContact} /></dl> : null}
            {errand.photos.length ? <div className="mt-5 border-t border-line pt-4"><h3 className="text-sm font-extrabold text-ink">Photos</h3><div className="mt-3 flex flex-wrap gap-3">{[...errand.photos].sort((a, b) => a.position - b.position).map((photo) => <ErrandPhoto key={photo.mediaId} mediaId={photo.mediaId} />)}</div></div> : null}
          </section>

          {assignment ? (
            <section className="rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-5" aria-labelledby="errand-timeline">
              <h2 id="errand-timeline" className="text-base font-extrabold text-ink">Timeline</h2>
              {timelineQuery.isLoading ? <div className="mt-4 grid gap-3"><Skeleton className="h-12" /><Skeleton className="h-12" /></div> : null}
              {timelineQuery.error ? <div className="mt-4"><ApiErrorMessage error={timelineQuery.error} fallback="We could not load the assignment timeline." /><Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => void timelineQuery.refetch()}>Try again</Button></div> : null}
              {timelineQuery.data?.length === 0 ? <p className="mt-3 text-sm text-muted">No timeline updates are available yet.</p> : null}
              {timelineQuery.data?.length ? <ol className="mt-4 grid gap-4">{timelineQuery.data.map((event) => <li key={event.id} className="flex gap-3"><span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-green-bg text-green-800"><CheckCircle2 aria-hidden="true" className="size-4" /></span><div className="min-w-0"><p className="text-sm font-bold text-ink">{timelineLabel(event.type)}</p><p className="mt-0.5 text-xs text-muted">{dateLabel(event.createdAt)} · {event.actorType.toLowerCase()}</p>{event.note ? <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink-2">{event.note}</p> : null}</div></li>)}</ol> : null}
            </section>
          ) : null}
        </div>

        <aside className="grid gap-4">
          {assignment ? <RunnerCard runnerId={assignment.runnerId} amountMinor={assignment.agreedAmountMinor} /> : null}
          {errand.status === 'OPEN' ? (
            <section className="rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
              <h2 className="text-base font-extrabold text-ink">Manage errand</h2>
              <p className="mt-1 text-sm text-muted">{errand.extended ? 'You have already extended this deadline once.' : 'Keep your errand open longer to receive offers.'}</p>
              <Button type="button" className="mt-4 w-full" variant="ghost" disabled={!canExtend || extend.isPending} onClick={() => extend.mutate()}>
                {extend.isPending ? 'Extending…' : errand.extended ? 'Already extended' : 'Extend deadline'}
              </Button>
              {errand.expiresAt ? <p className="mt-3 text-xs text-muted">Current deadline: {dateLabel(errand.expiresAt)}</p> : null}
            </section>
          ) : null}
          {assignment ? <Link href={`/assignments/${assignment.id}`} className="rounded-[var(--r-lg)] border border-line bg-tint p-4 text-sm font-bold text-green-900 hover:underline"><Truck aria-hidden="true" className="mr-2 inline size-4" />Assignment hub</Link> : null}
          {assignment?.status === 'ACCEPTED' ? <Link href={`/errands/${errand.id}/share`} className="rounded-[var(--r-lg)] border border-line bg-tint p-4 text-sm font-bold text-green-900 hover:underline">Share progress with a trusted contact</Link> : null}
          {errand.status === 'DISPUTED' ? <Link href={assignment ? `/assignments/${assignment.id}` : '/support'} className="rounded-[var(--r-lg)] border border-amber/30 bg-amber-bg p-4 text-sm font-bold text-amber"><AlertCircle aria-hidden="true" className="mr-2 inline size-4" />View dispute and next steps</Link> : null}
          {errand.status === 'COMPLETED' ? <div className="rounded-[var(--r-lg)] border border-green-200 bg-green-bg p-4 text-sm text-green-900"><CheckCircle2 aria-hidden="true" className="mr-2 inline size-4" />This errand is complete.</div> : null}
          {errand.status === 'CANCELLED' ? <div className="rounded-[var(--r-lg)] border border-red-200 bg-red-bg p-4 text-sm text-red">This errand is closed. Repost it to create a fresh draft.</div> : null}
        </aside>
      </div>

      <Dialog open={offerToSelect !== null} onOpenChange={(open) => { if (!open && !selectRunner.isPending) setOfferToSelect(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select {offerToSelect?.runnerName}?</DialogTitle>
            <DialogDescription>
              You are agreeing to a runner fee of {offerToSelect ? money(offerToSelect.amountMinor) : ''}. The runner will have a limited acceptance window; the assignment page will show the deadline and their response.
            </DialogDescription>
          </DialogHeader>
          {offerToSelect ? (
            <div className="rounded-[var(--r)] bg-panel p-3 text-sm">
              <p className="font-extrabold text-ink">{errand.title}</p>
              <p className="mt-1 text-ink-2">{offerToSelect.durationMinutes} min estimated time · {money(offerToSelect.amountMinor)}</p>
            </div>
          ) : null}
          {selectRunner.error ? (
            <Alert variant="danger" role="alert">
              {isApiError(selectRunner.error) && selectRunner.error.code === 'ASSIGNMENT_CONFLICT'
                ? 'Someone else selected a runner first. We refreshed the errand; review the current offers.'
                : isApiError(selectRunner.error) && selectRunner.error.code === 'ERRAND_EXPIRED'
                  ? 'This errand has expired and cannot be assigned.'
                  : isApiError(selectRunner.error) && selectRunner.error.code === 'OFFER_NOT_ELIGIBLE'
                    ? 'This runner is at capacity and cannot accept another errand right now.'
                    : isApiError(selectRunner.error) && selectRunner.error.code === 'OFFER_VERSION_MISMATCH'
                      ? 'The offer changed since you opened this confirmation. The latest offers have been loaded; please review again.'
                      : selectRunner.error instanceof Error ? selectRunner.error.message : 'We could not select this runner. Please try again.'}
            </Alert>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={selectRunner.isPending} onClick={() => { setOfferToSelect(null); selectRunner.reset(); }}>Cancel</Button>
            <Button
              type="button"
              disabled={!offerToSelect || selectRunner.isPending}
              onClick={() => {
                if (offerToSelect) selectRunner.mutate({ offer: offerToSelect, idempotencyKey: crypto.randomUUID() });
              }}
            >
              {selectRunner.isPending ? 'Selecting…' : `Confirm selection · ${offerToSelect ? money(offerToSelect.amountMinor) : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
