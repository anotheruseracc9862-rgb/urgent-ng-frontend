'use client';

import { isService } from '@/features/reference/flow';
import { PageLoading } from '@/components/shell/page-loading';
import { PageHead } from '@/components/shell/page-head';
import { useApiMutation } from '@/lib/query/mutations';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { Alert, Avatar, Button, Skeleton } from '@urgent/ui';
import { ArrowLeft, Bookmark, Check, LockKeyhole, MessageSquare, Sparkles, Star, Tag } from 'lucide-react';
import { api, isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { offersApi } from '@/features/offers/api';
import { runnerApi } from '@/features/runner/api';
import { marketplaceApi } from '../api';

type Photo = components['schemas']['ErrandPhotoDto'];

const eligibilityMessages: Record<string, string> = {
  ACCOUNT_NOT_ACTIVE: 'Your account must be active before you can send offers.',
  PHONE_NOT_VERIFIED: 'Verify your phone number before sending offers.',
  NOT_VERIFIED: 'Complete runner verification before sending offers.',
  VERIFICATION_PENDING: 'Runner verification is still being reviewed.',
  NO_RUNNER_PROFILE: 'Complete your runner profile before sending offers.',
  OPERATING_AREA_REQUIRED: 'Confirm your operating area and save your runner profile before sending offers.',
  UNAVAILABLE: 'Set your runner availability to available before sending offers.',
  RESTRICTED: 'Your account currently has a restriction that prevents new offers.',
};

const money = (minor: number | null) =>
  minor === null ? 'Not set' : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(minor / 100);

const dateLabel = (value: string) => new Date(value).toLocaleString('en-NG', {
  day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
});

function Area({ label, area }: { label: string; area: components['schemas']['PublicAreaDto'] | null }) {
  if (!area) return null;
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden="true" className={`mt-1.5 size-2.5 shrink-0 ${label === 'Pickup' ? 'rounded-full bg-green' : 'rounded-sm bg-ink'}`} />
      <div className="min-w-0 text-sm text-ink-2">
        <p className="font-bold text-ink">{label} <span className="font-normal text-muted">· Approximate</span></p>
        <p className="mt-0.5 break-words">{[...new Set([area.area, area.lga, area.state].filter(Boolean))].join(', ')}</p>
      </div>
    </div>
  );
}

function ErrandPhoto({ photo }: { photo: Photo }) {
  const mediaId = photo.mediaId;
  const image = useQuery({
    queryKey: queryKeys.media.url(mediaId),
    queryFn: () => api<components['schemas']['MediaUrlDto']>(`/media/${mediaId}/url`),
    staleTime: 4 * 60_000,
  });
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl bg-panel">
      {image.data?.url ? <Image src={image.data.url} alt="Errand item" fill unoptimized sizes="(max-width: 640px) 45vw, 180px" className="object-cover" /> : <Skeleton className="size-full" aria-label="Loading errand photo" />}
    </div>
  );
}

export function MarketplaceErrandPage({ errandId }: { errandId: string }) {
  const queryClient = useQueryClient();
  const errand = useQuery({
    queryKey: queryKeys.marketplace.detail(errandId),
    queryFn: () => offersApi.marketplaceErrand(errandId),
    retry: false,
  });
  const eligibility = useQuery({
    queryKey: queryKeys.runner.eligibility(),
    queryFn: runnerApi.eligibility,
    retry: false,
  });
  const photoMediaId = errand.data?.requester.photoMediaId;
  const requesterPhoto = useQuery({
    queryKey: queryKeys.media.url(photoMediaId ?? ''),
    queryFn: () => api<components['schemas']['MediaUrlDto']>(`/media/${photoMediaId}/url`),
    enabled: !!photoMediaId,
    staleTime: 4 * 60_000,
  });
  const saveMutation = useApiMutation({ affects: ['marketplace'],
    mutationFn: () => marketplaceApi.setSaved(errandId, !(errand.data?.saved ?? false)),
    onSuccess: async (result) => {
      if (errand.data) queryClient.setQueryData(queryKeys.marketplace.detail(errandId), { ...errand.data, saved: result.saved });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['marketplace', 'feed'] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.saved() }),
      ]);
    },
  });

  if (errand.isPending || eligibility.isPending) {
    return <PageLoading title="Errand details" eyebrow="Marketplace" width="w-full" />;
  }
  if (errand.error || !errand.data) {
    return (
      <main className="mx-auto max-w-4xl">
        <Alert variant="danger" role="alert">
          <p>{isApiError(errand.error) && errand.error.code === 'RESOURCE_NOT_FOUND'
            ? 'This errand is no longer available, or you do not have permission to view it.'
            : 'We could not load this errand.'}</p>
          <Button type="button" variant="ghost" className="mt-2" onClick={() => void errand.refetch()}>Try again</Button>
        </Alert>
      </main>
    );
  }

  const current = errand.data;
  const eligibilityError = eligibility.error;
  const canOffer = !eligibilityError && eligibility.data?.canOffer === true;
  const reasons = eligibility.data?.reasons ?? [];
  const pickup = current.pickupApprox ?? current.pickup;
  const destination = current.destinationApprox ?? current.destination;

  return (
    <main className="grid min-w-0 content-start gap-4 pb-10">
      <Link href="/marketplace" className="flex min-h-9 w-fit items-center gap-2 rounded-full text-sm font-bold text-muted transition-colors hover:text-green-900 focus-visible:outline-2 focus-visible:outline-green max-sm:hidden">
        <ArrowLeft aria-hidden="true" className="size-4" />Back to marketplace
      </Link>
      <PageHead
        eyebrow={`Errand details · ${current.category.name}`}
        title={<span className="block max-w-[760px] break-words">{current.title}</span>}
        actions={canOffer ? <Button asChild><Link href={`/marketplace/${errandId}/offer`}><Tag aria-hidden="true" />Send an offer</Link></Button> : undefined}
      />
      <div className="flex flex-wrap items-center gap-2 px-1.5 text-xs">
        <span className="rounded-full bg-tint-2 px-3 py-1.5 font-bold text-green-900">Open for offers</span>
        {current.priority === 'URGENT' ? <span className="rounded-full bg-amber-bg px-3 py-1.5 font-bold text-amber">Urgent</span> : null}
        {current.boosted ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-bg px-3 py-1.5 font-bold text-amber"><Sparkles aria-hidden="true" className="size-3.5" />Boosted</span> : null}
        <span className="text-muted">Posted <time dateTime={current.postedAt}>{dateLabel(current.postedAt)}</time></span>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
        <div className="grid min-w-0 content-start gap-4">
          <section aria-labelledby="errand-details-title" className="min-w-0 rounded-[var(--r-lg)] bg-surface p-[18px] shadow-[var(--shadow)] sm:p-[22px]">
            <h2 id="errand-details-title" className="font-extrabold text-ink">Details</h2>
            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-2">{current.description}</p>
            <div className="mt-4 grid gap-4 rounded-[var(--r-sm)] bg-panel p-4">
              <Area label="Pickup" area={pickup} />
              <Area label={isService(current.category) ? 'Service address' : 'Destination'} area={destination} />
              {!pickup && !destination ? <p className="text-sm text-muted">Area details are not available.</p> : null}
            </div>
            <dl className="mt-2 divide-y divide-line-2 text-[13px] [&>div]:flex [&>div]:justify-between [&>div]:gap-5 [&>div]:py-3 [&_dt]:shrink-0 [&_dt]:text-muted [&_dd]:text-right [&_dd]:font-bold [&_dd]:text-ink">
              <div><dt>When</dt><dd>{current.timeMode === 'ASAP' ? 'As soon as possible' : 'Scheduled'}{current.scheduledAt ? <time className="mt-1 block" dateTime={current.scheduledAt}>{dateLabel(current.scheduledAt)}</time> : null}</dd></div>
              <div><dt>Suggested budget</dt><dd>{money(current.suggestedBudgetMinor)}</dd></div>
              <div><dt>Priority</dt><dd>{current.priority === 'URGENT' ? 'Urgent' : 'Standard'}</dd></div>
              {current.distance ? <div><dt>Distance from you</dt><dd>{current.distance.label}</dd></div> : null}
              {current.itemSize ? <div><dt>Item size</dt><dd className="capitalize">{current.itemSize.toLowerCase().replaceAll('_', ' ')}</dd></div> : null}
              {current.itemValueMinor !== null ? <div><dt>Item value</dt><dd>{money(current.itemValueMinor)}</dd></div> : null}
              <div><dt>Closes</dt><dd><time dateTime={current.expiresAt}>{dateLabel(current.expiresAt)}</time></dd></div>
            </dl>
            <div className="mt-4 flex items-start gap-3 rounded-[var(--r)] bg-tint p-4 text-xs leading-relaxed text-green-900">
              <LockKeyhole aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <p>{isService(current.category) ? 'The exact address is kept private until an assignment is accepted.' : 'Exact pickup and destination details are kept private until an assignment is accepted.'}</p>
            </div>
            <div className="mt-5 border-t border-line-2 pt-4">
              <h3 className="text-sm font-extrabold text-ink">Additional instructions</h3>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-2">{current.instructions || 'No additional instructions.'}</p>
            </div>
          </section>
          {current.photos.length ? (
            <section className="grid gap-4 rounded-[var(--r-lg)] bg-surface p-[18px] shadow-[var(--shadow)] sm:p-[22px]">
              <h2 className="font-extrabold text-ink">Errand photos</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{current.photos.map((photo) => <ErrandPhoto key={photo.mediaId} photo={photo} />)}</div>
            </section>
          ) : null}
        </div>

        <aside aria-label="Requester and errand actions" className="grid min-w-0 content-start gap-4 lg:sticky lg:top-6">
          <section className="grid gap-4 rounded-[var(--r-lg)] bg-surface p-[18px] shadow-[var(--shadow)] sm:p-[22px]">
            <h2 className="font-extrabold text-ink">Posted by</h2>
            <div className="flex items-center gap-3">
              <Avatar size="lg" variant="violet" src={requesterPhoto.data?.url} alt="" initials={current.requester.firstName.slice(0, 2).toUpperCase()} />
              <div className="min-w-0">
                <p className="break-words font-bold text-ink">{current.requester.firstName}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                  <Star aria-hidden="true" className="size-3.5 shrink-0" />
                  {current.requester.rating === null
                    ? 'No public rating yet'
                    : `${current.requester.rating.toFixed(1)} / 5 · ${current.requester.ratingCount} ratings`}
                </p>
              </div>
            </div>
            {current.requester.badges.length ? (
              <ul className="flex flex-wrap gap-2" aria-label="Requester badges">
                {current.requester.badges.map((badge) => <li key={badge} className="inline-flex items-center gap-1 rounded-full bg-tint px-2.5 py-1 text-xs font-bold capitalize text-green-900"><Check aria-hidden="true" className="size-3.5" />{badge.toLowerCase().replaceAll('_', ' ')}</li>)}
              </ul>
            ) : <p className="text-xs text-muted">No requester badges yet.</p>}
          </section>

          <section className="grid gap-3 rounded-[var(--r-lg)] bg-surface p-[18px] shadow-[var(--shadow)] sm:p-[22px]">
            <div className="flex items-center gap-2 text-sm font-bold text-ink"><MessageSquare aria-hidden="true" className="size-4 text-muted" />{current.offerCount} {current.offerCount === 1 ? 'offer' : 'offers'} received</div>
            {eligibilityError ? (
              <Alert variant="warn" role="status">
                <p>We could not confirm your offer eligibility. Try again before sending an offer.</p>
                <Button type="button" variant="ghost" className="mt-2" onClick={() => void eligibility.refetch()}>Check again</Button>
              </Alert>
            ) : reasons.length ? reasons.map((reason) => (
              <Alert key={reason} variant="warn" role="status">{eligibilityMessages[reason] ?? 'Your runner account is not currently eligible to send offers.'}</Alert>
            )) : null}
            {!canOffer && !eligibilityError && !reasons.length ? (
              <Alert variant="warn" role="status">Your account is not currently eligible to send offers.</Alert>
            ) : null}
            {!canOffer && reasons.includes('NOT_VERIFIED') ? <Button asChild variant="ghost"><Link href="/verification">Complete verification</Link></Button> : null}
            <Button type="button" variant={current.saved ? 'soft' : 'ghost'} aria-pressed={current.saved} className="w-full px-3 text-xs" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              <Bookmark aria-hidden="true" className={current.saved ? 'fill-current' : undefined} />
              {saveMutation.isPending ? 'Saving…' : current.saved ? 'Remove from saved errands' : 'Save errand'}
            </Button>
            {saveMutation.error ? <Alert variant="danger" role="alert">{isApiError(saveMutation.error) ? saveMutation.error.message : 'We could not update saved errands.'}</Alert> : null}
          </section>
          <p className="break-all px-2 text-[11px] leading-relaxed text-muted">Errand reference: {current.id}</p>
        </aside>
      </div>
    </main>
  );
}
