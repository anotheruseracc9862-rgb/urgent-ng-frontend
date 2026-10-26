import Link from 'next/link';
import { Check, MessageSquare, X } from 'lucide-react';
import type { components } from '@urgent/api-client';
import { estimateLabel } from '@/components/forms/duration-input';

type MyOffer = components['schemas']['MyOfferDto'];

const naira = (minor: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(minor / 100);

/**
 * What the runner's own offer needs from them, in one phrase. An ended offer is shown too: one offer per errand
 * is allowed, so a declined or withdrawn one is the last word, and the page must not offer another.
 */
export function myOfferStatus(offer: MyOffer): { label: string; needsYou: boolean; ended: boolean; declined: boolean } {
  switch (offer.status) {
    case 'REJECTED': return { label: 'Offer declined', needsYou: false, ended: true, declined: true };
    case 'WITHDRAWN': return { label: 'Offer withdrawn', needsYou: false, ended: true, declined: false };
    case 'SELECTED': return { label: 'You were chosen', needsYou: true, ended: false, declined: false };
    case 'EXPIRED':
    case 'CLOSED': return { label: 'Offer closed', needsYou: false, ended: true, declined: false };
    default:
  }
  if (offer.needsReconfirmation) return { label: 'Reconfirm your offer', needsYou: true, ended: false, declined: false };
  if (offer.awaitingParty === 'RUNNER') return { label: 'Counter received', needsYou: true, ended: false, declined: false };
  return { label: 'Offer sent', needsYou: false, ended: false, declined: false };
}

const ENDED_NOTE: Record<string, string> = {
  REJECTED: 'The requester declined this offer. Only one offer is allowed on an errand, so you cannot send another.',
  WITHDRAWN: 'You withdrew this offer. Only one offer is allowed on an errand, so you cannot send another.',
};

/**
 * A small mark on an errand the runner has already offered on: "Offer sent · ₦6,000", or "Counter received"
 * when the requester answered and it is the runner's move. Green when waiting, amber when it needs them.
 */
export function MyOfferBadge({ offer, className = '' }: { offer: MyOffer; className?: string }) {
  const { label, needsYou, ended, declined } = myOfferStatus(offer);
  const tone = declined ? 'bg-red-bg text-red' : ended ? 'bg-panel text-muted' : needsYou ? 'bg-amber-bg text-amber' : 'bg-ok-bg text-ok';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-extrabold ${tone} ${className}`}>
      {ended ? <X aria-hidden="true" className="size-3.5" /> : needsYou ? <MessageSquare aria-hidden="true" className="size-3.5" /> : <Check aria-hidden="true" className="size-3.5" />}
      {`${label} · ${naira(offer.amountMinor)}`}
    </span>
  );
}

/** The runner's own offer on the errand's page: what was offered, whose move it is, and a way into it. */
export function MyOfferCard({ offer }: { offer: MyOffer }) {
  const { label, needsYou, ended } = myOfferStatus(offer);
  const status = ended
    ? (ENDED_NOTE[offer.status] ?? 'This offer is closed.')
    : offer.status === 'SELECTED' ? 'The requester chose you. Open it to continue.'
      : needsYou ? (offer.needsReconfirmation ? 'The errand changed. Confirm your offer still stands.' : 'The requester sent a counter. Your move.')
        : 'Waiting for the requester.';
  return (
    <section aria-label="Your offer" className="grid gap-3 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-extrabold text-ink">Your offer</h2>
        <MyOfferBadge offer={offer} />
      </div>
      <dl className="divide-y divide-line-2 text-[13px] [&>div]:flex [&>div]:justify-between [&>div]:gap-5 [&>div]:py-3 [&_dt]:shrink-0 [&_dt]:text-muted [&_dd]:text-right [&_dd]:font-bold [&_dd]:text-ink">
        <div><dt>Your price</dt><dd>{naira(offer.amountMinor)}</dd></div>
        <div><dt>Estimated time</dt><dd>{estimateLabel(offer.durationMinutes)}</dd></div>
        <div><dt>Status</dt><dd>{status}</dd></div>
      </dl>
      <Link href={`/offers/${offer.id}`} className="inline-flex min-h-11 w-fit items-center justify-center rounded-full bg-ink px-5 text-sm font-bold text-white transition-colors hover:bg-green-900 motion-reduce:transition-none">
        {needsYou && !ended ? label : 'Open your offer'}
      </Link>
    </section>
  );
}
