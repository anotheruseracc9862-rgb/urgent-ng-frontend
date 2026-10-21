import Link from 'next/link';
import { Check, MessageSquare } from 'lucide-react';
import type { components } from '@urgent/api-client';
import { estimateLabel } from '@/components/forms/duration-input';

type MyOffer = components['schemas']['MyOfferDto'];

const naira = (minor: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(minor / 100);

/** What the runner's own offer needs from them, in one phrase. */
export function myOfferStatus(offer: MyOffer): { label: string; needsYou: boolean } {
  if (offer.needsReconfirmation) return { label: 'Reconfirm your offer', needsYou: true };
  if (offer.awaitingParty === 'RUNNER') return { label: 'Counter received', needsYou: true };
  return { label: 'Offer sent', needsYou: false };
}

/**
 * A small mark on an errand the runner has already offered on: "Offer sent · ₦6,000", or "Counter received"
 * when the requester answered and it is the runner's move. Green when waiting, amber when it needs them.
 */
export function MyOfferBadge({ offer, className = '' }: { offer: MyOffer; className?: string }) {
  const { label, needsYou } = myOfferStatus(offer);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-extrabold ${needsYou ? 'bg-amber-bg text-amber' : 'bg-ok-bg text-ok'} ${className}`}>
      {needsYou ? <MessageSquare aria-hidden="true" className="size-3.5" /> : <Check aria-hidden="true" className="size-3.5" />}
      {`${label} · ${naira(offer.amountMinor)}`}
    </span>
  );
}

/** The runner's own offer on the errand's page: what was offered, whose move it is, and a way into it. */
export function MyOfferCard({ offer }: { offer: MyOffer }) {
  const { label, needsYou } = myOfferStatus(offer);
  return (
    <section aria-label="Your offer" className="grid gap-3 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-extrabold text-ink">Your offer</h2>
        <MyOfferBadge offer={offer} />
      </div>
      <dl className="divide-y divide-line-2 text-[13px] [&>div]:flex [&>div]:justify-between [&>div]:gap-5 [&>div]:py-3 [&_dt]:shrink-0 [&_dt]:text-muted [&_dd]:text-right [&_dd]:font-bold [&_dd]:text-ink">
        <div><dt>Your price</dt><dd>{naira(offer.amountMinor)}</dd></div>
        <div><dt>Estimated time</dt><dd>{estimateLabel(offer.durationMinutes)}</dd></div>
        <div><dt>Status</dt><dd>{needsYou ? (offer.needsReconfirmation ? 'The errand changed. Confirm your offer still stands.' : 'The requester sent a counter. Your move.') : 'Waiting for the requester.'}</dd></div>
      </dl>
      <Link href={`/offers/${offer.id}`} className="inline-flex min-h-11 w-fit items-center justify-center rounded-full bg-ink px-5 text-sm font-bold text-white transition-colors hover:bg-green-900 motion-reduce:transition-none">
        {needsYou ? label : 'Open your offer'}
      </Link>
    </section>
  );
}
