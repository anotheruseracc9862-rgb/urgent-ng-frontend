'use client';

import * as React from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { PushOptInPrompt } from '@/features/push/push-opt-in-prompt';

/**
 * Which errand was just posted. It lives in memory, not in storage: posting moves to the errand's page
 * within the app, and a reload or a later visit starts empty, so the confirmation never comes back.
 */
let justPosted: string | null = null;

/** Called when an errand is posted, just before going to its page, so that page shows the confirmation once. */
export function markErrandJustPosted(errandId: string): void {
  justPosted = errandId;
}

export const wasErrandJustPosted = (errandId: string): boolean => justPosted === errandId;

/**
 * The confirmation after posting, on the errand's own page rather than a page of its own. It shows
 * once and offers to turn on push, which is the moment it is most useful: nobody has made an offer yet.
 */
export function ErrandPostedBanner({ errandId, status }: { errandId: string; status: string }) {
  const [visible, setVisible] = React.useState(() => justPosted === errandId);

  React.useEffect(() => {
    if (justPosted === errandId) justPosted = null;
  }, [errandId]);

  if (!visible || status !== 'OPEN') return null;
  return (
    <>
      <section role="status" aria-label="Errand posted" className="flex items-start gap-3 rounded-[var(--r-lg)] bg-tint p-4 sm:p-[22px]">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-green-800" />
        <div className="min-w-0 flex-1">
          <h2 className="font-extrabold text-ink">Your errand is live</h2>
          <p className="mt-1 text-sm text-green-900">Nearby runners were notified. Offers appear here as they arrive.</p>
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
