'use client';

import { PageLoading } from '@/components/shell/page-loading';
import { useApiMutation } from '@/lib/query/mutations';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { Alert, Button, Skeleton } from '@urgent/ui';
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
  UNAVAILABLE: 'Set your runner availability to available before sending offers.',
  RESTRICTED: 'Your account currently has a restriction that prevents new offers.',
};

const money = (minor: number | null) =>
  minor === null ? 'Not set' : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(minor / 100);

function Area({ label, area }: { label: string; area: components['schemas']['PublicLocationViewDto'] | null }) {
  if (!area) return null;
  return (
    <div className="rounded-xl bg-panel p-3">
      <p className="text-xs font-extrabold uppercase tracking-wide text-muted">{label} · Approximate</p>
      <p className="mt-1 font-bold text-ink">{[area.area, area.lga, area.state].filter(Boolean).join(', ')}</p>
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
    return <PageLoading title="Errand" eyebrow="Marketplace" width="max-w-5xl" />;
  }
  if (errand.error || !errand.data) {
    return (
      <main className="mx-auto max-w-4xl">
        <Alert variant="danger" role="alert">
          <p>{isApiError(errand.error) && errand.error.code === 'RESOURCE_NOT_FOUND'
            ? 'This errand is no longer available, or you do not have permission to view it.'
            : 'We could not load this errand.'}</p>
          {isApiError(errand.error) && errand.error.requestId ? <p className="mt-1 text-xs">Request ID: {errand.error.requestId}</p> : null}
          <Button type="button" variant="ghost" className="mt-2" onClick={() => void errand.refetch()}>Try again</Button>
        </Alert>
      </main>
    );
  }

  const current = errand.data;
  const eligibilityError = eligibility.error;
  const canOffer = !eligibilityError && eligibility.data?.canOffer === true;
  const reasons = eligibility.data?.reasons ?? [];

  return (
    <main className="mx-auto grid max-w-5xl gap-4">
      <Link href="/marketplace" className="w-fit text-sm font-bold text-green-800 hover:underline">← Back to marketplace</Link>
      <header className="rounded-[var(--r-lg)] border border-line bg-tint p-4 shadow-[var(--shadow)] sm:p-6">
        <div className="flex flex-wrap gap-2">
          {current.boosted ? <span className="rounded-full bg-amber-bg px-3 py-1 text-xs font-extrabold text-amber">Boosted</span> : null}
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-extrabold text-green-800">{current.category.name}</span>
          <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-muted">{current.timeMode}</span>
        </div>
        <h1 className="mt-3 text-2xl font-extrabold text-ink sm:text-3xl">{current.title}</h1>
        <p className="mt-2 whitespace-pre-wrap text-sm text-ink-2">{current.description}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-surface px-3 py-2 font-bold text-ink">Budget {money(current.suggestedBudgetMinor)}</span>
          <span className="rounded-full bg-surface px-3 py-2 font-bold text-ink">{current.offerCount} offers</span>
          {current.distance ? <span className="rounded-full bg-surface px-3 py-2 font-bold text-ink">{current.distance.label} away</span> : null}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid content-start gap-4">
          <section className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
            <h2 className="font-extrabold text-ink">Approximate areas</h2>
            <p className="text-xs text-muted">Exact pickup and destination details are kept private until an assignment is accepted.</p>
            <Area label="Pickup" area={current.pickupApprox} />
            <Area label="Destination" area={current.destinationApprox} />
            {current.pickupApprox === null && current.destinationApprox === null ? <p className="text-sm text-muted">Area details are not available.</p> : null}
          </section>
          <section className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
            <h2 className="font-extrabold text-ink">Instructions and item</h2>
            <p className="whitespace-pre-wrap text-sm text-ink-2">{current.instructions || 'No additional instructions.'}</p>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {current.itemSize ? <div><dt className="text-xs text-muted">Item size</dt><dd className="font-bold text-ink">{current.itemSize.toLowerCase()}</dd></div> : null}
              {current.itemValueMinor !== null ? <div><dt className="text-xs text-muted">Item value</dt><dd className="font-bold text-ink">{money(current.itemValueMinor)}</dd></div> : null}
              {current.scheduledAt ? <div><dt className="text-xs text-muted">Scheduled</dt><dd className="font-bold text-ink">{new Date(current.scheduledAt).toLocaleString()}</dd></div> : null}
            </dl>
          </section>
          {current.photos.length ? (
            <section className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
              <h2 className="font-extrabold text-ink">Errand photos</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{current.photos.map((photo) => <ErrandPhoto key={photo.mediaId} photo={photo} />)}</div>
            </section>
          ) : null}
        </div>

        <aside className="grid content-start gap-4">
          <section className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
            <h2 className="font-extrabold text-ink">Requester</h2>
            <p className="text-lg font-bold text-ink">{current.requester.firstName}</p>
            <p className="text-sm text-muted">
              {current.requester.rating === null
                ? 'No public rating yet'
                : `${current.requester.rating.toFixed(1)} / 5 · ${current.requester.ratingCount} ratings`}
            </p>
            {current.requester.badges.length ? (
              <ul className="flex flex-wrap gap-2" aria-label="Requester badges">
                {current.requester.badges.map((badge) => <li key={badge} className="rounded-full bg-panel px-3 py-1 text-xs font-bold text-ink">{badge.toLowerCase().replaceAll('_', ' ')}</li>)}
              </ul>
            ) : <p className="text-xs text-muted">No requester badges yet.</p>}
          </section>

          <section className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
            {eligibilityError ? (
              <Alert variant="warn" role="status">
                <p>We could not confirm your offer eligibility. Try again before sending an offer.</p>
                {isApiError(eligibilityError) && eligibilityError.requestId ? <p className="mt-1 text-xs">Request ID: {eligibilityError.requestId}</p> : null}
                <Button type="button" variant="ghost" className="mt-2" onClick={() => void eligibility.refetch()}>Check again</Button>
              </Alert>
            ) : reasons.length ? reasons.map((reason) => (
              <Alert key={reason} variant="warn" role="status">{eligibilityMessages[reason] ?? 'Your runner account is not currently eligible to send offers.'}</Alert>
            )) : null}
            {canOffer ? (
              <Button asChild><Link href={`/marketplace/${errandId}/offer`}>Send an offer</Link></Button>
            ) : !eligibilityError && !reasons.length ? (
              <Alert variant="warn" role="status">Your account is not currently eligible to send offers.</Alert>
            ) : null}
            {!canOffer && reasons.includes('NOT_VERIFIED') ? <Button asChild variant="ghost"><Link href="/verification">Complete verification</Link></Button> : null}
            <Button type="button" variant="ghost" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? 'Saving…' : current.saved ? 'Remove from saved errands' : 'Save errand'}
            </Button>
            {saveMutation.error ? <Alert variant="danger" role="alert">{isApiError(saveMutation.error) ? saveMutation.error.message : 'We could not update saved errands.'}</Alert> : null}
          </section>
        </aside>
      </div>
    </main>
  );
}
