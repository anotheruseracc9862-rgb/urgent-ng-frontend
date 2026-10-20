'use client';

import { PageLoading } from '@/components/shell/page-loading';
import { PageHead } from '@/components/shell/page-head';
import { useApiMutation } from '@/lib/query/mutations';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react';
import { Alert, Button, MoneyInput } from '@urgent/ui';
import { ContactSharingNotice } from '@/components/forms/contact-sharing-notice';
import { DurationInput } from '@/components/forms/duration-input';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { offersApi } from '../api';
import { PushOptInPrompt } from '@/features/push/push-opt-in-prompt';

const money = (minor: number | null) =>
  minor === null
    ? 'Not set'
    : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(minor / 100);

function resetLabel(value: string) {
  return new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' }).format(new Date(value));
}

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

export function SubmitOfferPage({ errandId }: { errandId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [amountMinor, setAmountMinor] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(30);
  const [message, setMessage] = useState('');
  const [availabilityConfirmed, setAvailabilityConfirmed] = useState(false);
  const errand = useQuery({
    queryKey: queryKeys.marketplace.detail(errandId),
    queryFn: () => offersApi.marketplaceErrand(errandId),
  });
  const limit = useQuery({
    queryKey: queryKeys.runner.offerLimit(),
    queryFn: offersApi.runnerOfferLimit,
  });
  const eligibility = useQuery({
    queryKey: queryKeys.runner.eligibility(),
    queryFn: offersApi.runnerEligibility,
  });
  const submit = useApiMutation({ affects: ['offers', 'runner'],
    mutationFn: () => offersApi.submit(errandId, {
      amountMinor: amountMinor ?? 0,
      durationMinutes: duration ?? 0,
      availabilityConfirmed,
      ...(message.trim() ? { message: message.trim() } : {}),
    }, crypto.randomUUID()),
    onSuccess: async (offer) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.runner.offerLimit() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.runner.offers({}) }),
      ]);
    },
  });

  if (errand.isPending || limit.isPending || eligibility.isPending) {
    return <PageLoading title="Send an offer" eyebrow="Runner" width="max-w-5xl" />;
  }
  if (errand.error || !errand.data || limit.error || !limit.data || eligibility.error || !eligibility.data) {
    const error = errand.error ?? limit.error ?? eligibility.error;
    return <main className="grid min-w-0 content-start gap-4 pb-10"><Alert variant="danger" role="alert">{isApiError(error) && error.code === 'RESOURCE_NOT_FOUND' ? 'This errand is no longer available, or you do not have permission to view it.' : 'We could not load the errand or runner offer requirements.'}</Alert><Button type="button" variant="ghost" className="w-fit" onClick={() => { void errand.refetch(); void limit.refetch(); void eligibility.refetch(); }}>Try again</Button></main>;
  }

  const currentErrand = errand.data;
  const currentLimit = limit.data;
  const currentEligibility = eligibility.data;
  const showLimit = currentLimit.isAtLimit || currentLimit.remaining <= 0;
  const allowed = currentEligibility.canOffer && !showLimit;
  const submitError = isApiError(submit.error)
    ? submit.error.code === 'OFFER_ALREADY_EXISTS'
      ? 'You already have an offer on this errand. Open it from My offers to edit or respond.'
      : submit.error.code === 'OFFER_NOT_ELIGIBLE'
        ? 'You are not eligible to send an offer right now. Check your runner eligibility below.'
        : submit.error.message
    : submit.error instanceof Error ? submit.error.message : null;

  if (submit.data) {
    return (
      <main className="grid min-w-0 content-start gap-4 pb-10">
        <PageHead
          eyebrow="Offer sent"
          title="Your offer is on its way"
          description="You can get notified if the requester replies while you are away."
          actions={<Button type="button" onClick={() => router.push(`/offers/${submit.data.id}`)}>Continue to offer</Button>}
        />
        <PushOptInPrompt />
      </main>
    );
  }

  return (
    <main className="grid min-w-0 content-start gap-4 pb-10">
      <Link href={`/marketplace/${errandId}`} className="inline-flex w-fit items-center gap-2 text-xs font-bold text-green-900 hover:underline max-sm:hidden"><ArrowLeft aria-hidden="true" className="size-4" />Back to errand</Link>
      <PageHead
        eyebrow="Runner view · Send an offer"
        title={<span className="block max-w-[760px] break-words">{currentErrand.title}</span>}
        description={`${currentErrand.category.name} · ${currentErrand.pickup?.area ?? 'Pickup area unavailable'}${currentErrand.destination?.area ? ` → ${currentErrand.destination.area}` : ''}`}
        actions={<>
          <span className="rounded-full bg-tint px-3 py-1.5 text-xs font-bold text-green-900">Requester budget {money(currentErrand.suggestedBudgetMinor)}</span>
          {currentErrand.distance ? <span className="rounded-full bg-panel px-3 py-1.5 text-xs font-bold text-ink-2">{currentErrand.distance.label}</span> : null}
        </>}
      />

      {showLimit ? (
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="min-w-0 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
            <div className="mx-auto grid size-36 place-items-center rounded-full border-8 border-lime bg-panel text-center">
              <p className="text-xl font-extrabold text-ink">{currentLimit.used} / {currentLimit.limit}<span className="mt-1 block text-xs font-semibold text-muted">offers used today</span></p>
            </div>
            <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted"><Clock3 aria-hidden="true" className="size-4" />Resets {resetLabel(currentLimit.resetsAt)} (Lagos time)</p>
            <ul className="mt-4 grid gap-2 text-sm text-ink-2">
              <li className="flex gap-2"><CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-green-800" />You can still edit existing offers.</li>
              <li className="flex gap-2"><CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-green-800" />You can still answer counter-offers.</li>
              <li className="flex gap-2"><CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-green-800" />You can still accept selected assignments.</li>
            </ul>
          </div>
          <div className="min-w-0 rounded-[var(--r-lg)] bg-ink p-4 text-white sm:p-[22px] shadow-[var(--shadow)]">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-extrabold text-lime">Runner Pro</span>
            {currentLimit.isPro ? (
              <>
                <h2 className="mt-4 text-2xl font-extrabold">Daily fair-use limit reached</h2>
                <p className="mt-2 text-sm text-white/75">Your Runner Pro allowance for today is used up. It resets {resetLabel(currentLimit.resetsAt)} (Lagos time).</p>
              </>
            ) : (
              <>
                <h2 className="mt-4 text-2xl font-extrabold">Need more offers a day?</h2>
                <p className="mt-2 text-sm text-white/75">Runner Pro gives you a much higher daily limit for new offers.</p>
                <Button asChild className="mt-5"><Link href="/pricing">View Runner Pro</Link></Button>
              </>
            )}
          </div>
        </section>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
          <form
            className="grid gap-4 min-w-0 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]"
            onSubmit={(event) => {
              event.preventDefault();
              if (amountMinor === null || amountMinor < 100 || duration === null || duration < 1 || duration > 1440) return;
              submit.mutate();
            }}
          >
            <div>
              <h2 className="text-base font-extrabold text-ink">Your offer</h2>
              <p className="mt-1 text-sm text-muted">Set your runner fee and estimated completion time.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid min-w-0 content-start gap-1.5">
                <label className="text-xs font-bold text-ink-2" htmlFor="offer-price">Your price</label>
                <MoneyInput id="offer-price" allowKobo={false} required value={amountMinor} onChange={setAmountMinor} placeholder="e.g. 5,500" autoComplete="off" />
                <p className="text-xs text-muted">The current system amount limits are validated when you submit.</p>
              </div>
              <div className="grid min-w-0 content-start gap-1.5">
                <span id="offer-duration-label" className="text-xs font-bold text-ink-2">Estimated time</span>
                <DurationInput id="offer-duration" value={duration} onChange={setDuration} />
                <p className="text-xs text-muted">From 1 minute up to 24 hours.</p>
              </div>
            </div>
            <label className="grid gap-1.5"><span className="text-xs font-bold text-ink-2">Message <span className="font-normal text-muted">(optional)</span></span>
              <textarea maxLength={500} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Why you are a good fit." className="min-h-24 w-full rounded-[var(--r)] border border-line bg-surface p-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-lime-600" />
            </label>
            <ContactSharingNotice />
            <label className="flex items-start gap-3 rounded-[var(--r)] bg-panel p-3 text-sm text-ink-2">
              <input type="checkbox" checked={availabilityConfirmed} onChange={(event) => setAvailabilityConfirmed(event.target.checked)} className="mt-0.5 size-4 accent-green-800" />
              <span>I confirm I am available to complete this errand within the estimated time.</span>
            </label>
            {submitError ? <Alert variant="danger" role="alert"><div className="flex flex-wrap items-center justify-between gap-2"><span>{submitError}</span>{isApiError(submit.error) && submit.error.code === 'OFFER_ALREADY_EXISTS' ? <Link className="font-bold underline" href="/offers">My offers</Link> : null}</div></Alert> : null}
            {submit.error && isApiError(submit.error) && submit.error.code === 'OFFER_NOT_ELIGIBLE' ? (
              <Alert variant="warn" role="status"><span className="inline-flex items-center gap-2"><AlertCircle aria-hidden="true" className="size-4" />Check your eligibility requirements in the panel.</span></Alert>
            ) : null}
            <div className="rounded-[var(--r)] bg-tint p-3.5 text-xs leading-relaxed text-green-900">
              <p className="font-extrabold text-ink">Payment is arranged directly with the requester.</p>
              <p className="mt-1">Urgent.ng does not collect or hold the runner fee.</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button asChild variant="ghost"><Link href={`/marketplace/${errandId}`}>Cancel</Link></Button>
              <Button type="submit" disabled={!allowed || !availabilityConfirmed || amountMinor === null || duration === null || submit.isPending}>{submit.isPending ? 'Sending…' : 'Send offer'}</Button>
            </div>
          </form>
          <aside className="grid gap-3 min-w-0 lg:sticky lg:top-6 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
            <div><h2 className="text-base font-extrabold text-ink">Today’s allowance</h2><p className="mt-1 text-sm text-muted">{currentLimit.remaining} of {currentLimit.limit} free offers left.</p></div>
            <div className="h-2 overflow-hidden rounded-full bg-panel"><span className="block h-full rounded-full bg-lime" style={{ width: `${Math.min(100, currentLimit.limit > 0 ? (currentLimit.used / currentLimit.limit) * 100 : 0)}%` }} /></div>
            <p className="text-xs text-muted">Resets {resetLabel(currentLimit.resetsAt)} (Lagos time). Editing and responding to a counter do not use another new offer.</p>
            {!currentEligibility.canOffer ? (
              <div className="grid gap-2 border-t border-line pt-3">
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink"><ShieldCheck aria-hidden="true" className="size-4" />Eligibility</h3>
                {currentEligibility.reasons.map((reason) => <Alert key={reason} variant="warn" role="status">{eligibilityMessages[reason] ?? 'Your runner account is not currently eligible to send offers.'}</Alert>)}
              </div>
            ) : null}
            <div className="border-t border-line pt-3">
              <h3 className="text-sm font-extrabold text-ink">When you cannot send</h3>
              <p className="mt-2 text-sm text-ink-2">You may be unable to send an offer if your runner account is not verified, you are unavailable, or you are already at capacity.</p>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
