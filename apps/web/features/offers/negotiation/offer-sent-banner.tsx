'use client';

import * as React from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { PushOptInPrompt } from '@/features/push/push-opt-in-prompt';

/**
 * Which offer was just sent. It lives in memory, not in storage: sending moves to the offer's page
 * within the app, and a reload or a later visit starts empty, so the confirmation never comes back.
 */
let justSent: string | null = null;

/** Called when an offer is sent, just before going to its page, so that page shows the confirmation once. */
export function markOfferJustSent(offerId: string): void {
  justSent = offerId;
}

export const wasOfferJustSent = (offerId: string): boolean => justSent === offerId;

/**
 * The confirmation after sending an offer, on the offer's own page rather than a page of its own. It
 * shows once, and offers to turn on push (only if this device does not have it yet): the requester's
 * answer is what the runner now waits for.
 */
export function OfferSentBanner({ offerId }: { offerId: string }) {
  const [visible, setVisible] = React.useState(() => justSent === offerId);

  React.useEffect(() => {
    if (justSent === offerId) justSent = null;
  }, [offerId]);

  if (!visible) return null;
  return (
    <>
      <section role="status" aria-label="Offer sent" className="flex items-start gap-3 rounded-[var(--r-lg)] bg-tint p-4 sm:p-[22px]">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-green-800" />
        <div className="min-w-0 flex-1">
          <h2 className="font-extrabold text-ink">Your offer is on its way</h2>
          <p className="mt-1 text-sm text-green-900">The requester can now accept it or send a counter. You will be told when they reply.</p>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setVisible(false)}
          className="-m-2 grid size-11 shrink-0 place-items-center rounded-full text-green-900 hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </section>
      <PushOptInPrompt compact />
    </>
  );
}
