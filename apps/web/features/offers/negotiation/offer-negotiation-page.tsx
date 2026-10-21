'use client';

import { PageLoading } from '@/components/shell/page-loading';
import { PageHead } from '@/components/shell/page-head';
import { useApiMutation } from '@/lib/query/mutations';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowUpRight, Clock3, History, Info, RefreshCw } from 'lucide-react';
import { Alert, Button, MoneyInput } from '@urgent/ui';
import { ContactSharingNotice } from '@/components/forms/contact-sharing-notice';
import { DurationInput, formatDuration } from '@/components/forms/duration-input';
import { OfferSentBanner } from './offer-sent-banner';
import { DEFAULT_MAX_OFFER_MINUTES } from '@/features/reference/flow';
import { isApiError } from '@/lib/api/client';
import { useSession } from '@/lib/auth/client';
import { queryKeys } from '@/lib/query/keys';
import { offersApi, type OfferNegotiation, type OfferTerms } from '../api';
import { JourneyHere } from '@/features/journey/journey-context';

type Action = 'edit' | 'counter' | 'accept' | 'reject' | 'withdraw' | 'reconfirm';

const money = (minor: number | null) =>
  minor === null
    ? null
    : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(minor / 100);

function closeReasonLabel(reason: string | null) {
  if (!reason) return 'This offer is closed.';
  return reason.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const dateLabel = (date: string) => new Intl.DateTimeFormat('en-NG', {
  dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(date));

function eventDescription(event: OfferNegotiation['history'][number], currentUserId: string, offer: OfferNegotiation) {
  if (event.type === 'SYSTEM_EVENT') {
    return event.message === 'ERRAND_EDITED' ? 'The errand was materially updated. The runner must reconfirm.' : 'Offer reconfirmed.';
  }
  if (event.type === 'ACCEPT') return 'Accepted the latest counter-offer.';
  if (event.type === 'REJECT') return 'Declined the offer.';
  if (event.type === 'WITHDRAW') return 'Withdrew the offer.';
  const party = event.actorUserId === currentUserId ? 'You' : event.actorUserId === offer.runnerId ? 'Runner' : 'Requester';
  const note = event.message ? ` — “${event.message}”` : '';
  if (event.type === 'OFFER_EDIT') {
    // The runner changing their own offer. Not a counter: say what changed, and from what.
    const earlier = offer.history.slice(0, offer.history.findIndex((candidate) => candidate.id === event.id))
      .reverse().find((candidate) => candidate.amountMinor !== null || candidate.durationMinutes !== null);
    const now = termsOf(event);
    const was = earlier ? termsOf(earlier) : '';
    return `${party === 'You' ? 'You changed your offer' : 'Runner changed their offer'}${now ? ` to ${now}` : ''}${was && was !== now ? ` (was ${was})` : ''}${note}`;
  }
  const terms = termsOf(event);
  return `${party} ${event.type === 'INITIAL_OFFER' ? 'offered' : 'countered'}${terms ? ` ${terms}` : ''}${note}`;
}

/** "₦7,500 · 1 day": the terms an event proposed. */
function termsOf(event: OfferNegotiation['history'][number]): string {
  return [
    event.amountMinor === null ? null : money(event.amountMinor),
    event.durationMinutes === null ? null : formatDuration(event.durationMinutes),
  ].filter(Boolean).join(' · ');
}

export function OfferNegotiationPage({ offerId }: { offerId: string }) {
  const session = useSession();
  const client = useQueryClient();
  const [formAction, setFormAction] = useState<'edit' | 'counter' | null>(null);
  const [amountMinor, setAmountMinor] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(30);
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const queryKey = queryKeys.offers.detail(offerId);
  const query = useQuery({
    queryKey,
    queryFn: () => offersApi.negotiation(offerId),
  });
  const mutation = useApiMutation({
    affects: ['offers'],
    mutationFn: async (input: { action: Action; terms?: OfferTerms }) => {
      const offer = query.data;
      if (!offer) throw new Error('Offer details are not loaded.');
      if (input.action === 'edit') return offersApi.edit(offerId, { ...input.terms!, expectedVersion: offer.version });
      if (input.action === 'counter') return offersApi.counter(offerId, { ...input.terms!, expectedVersion: offer.version });
      if (input.action === 'accept') return offersApi.acceptCounter(offerId, offer.version);
      if (input.action === 'reject') return offersApi.reject(offerId, offer.version);
      if (input.action === 'withdraw') return offersApi.withdraw(offerId);
      return offersApi.reconfirm(offerId, offer.version);
    },
    onSuccess: async () => {
      setFormAction(null);
      setNotice('The offer was updated.');
      await client.invalidateQueries({ queryKey });
      await query.refetch();
    },
    onError: async (error) => {
      if (isApiError(error) && error.code === 'OFFER_VERSION_MISMATCH') {
        setFormAction(null);
        setNotice('This offer changed in another session. We refreshed the latest terms and negotiation turn.');
        await query.refetch();
      }
      if (isApiError(error) && error.code === 'OFFER_ROUND_LIMIT_REACHED') {
        setFormAction(null);
        setNotice('The counter-offer limit is reached. Accept or decline the latest terms.');
        await query.refetch();
      }
    },
  });

  // The answer to a button just pressed sits beside the buttons, and scrolls into view if it is not already.
  // On a phone the top of the page is a screen away, and an error up there looks like nothing happened.
  useEffect(() => {
    if (notice || mutation.error) feedbackRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [notice, mutation.error]);

  if (query.isPending) {
    return <PageLoading title="Offer" eyebrow="Negotiation" width="max-w-5xl" />;
  }
  if (query.error || !query.data) {
    return (
      <main className="mx-auto max-w-4xl">
        <Link href="/offers" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-green-800 max-sm:hidden"><ArrowLeft aria-hidden="true" className="size-4" />My offers</Link>
        <Alert variant="danger" role="alert">{isApiError(query.error) && query.error.code === 'RESOURCE_NOT_FOUND' ? 'This offer could not be found, or you do not have permission to view it.' : 'We could not load this offer.'}</Alert>
        <Button className="mt-3" type="button" variant="ghost" onClick={() => void query.refetch()}><RefreshCw aria-hidden="true" className="mr-2 size-4" />Try again</Button>
      </main>
    );
  }

  const offer = query.data;
  const isRunner = session.me.id === offer.runnerId;
  const role = isRunner ? 'RUNNER' : 'REQUESTER';
  const active = offer.status === 'ACTIVE';
  const myTurn = offer.awaitingParty === role;
  const canEdit = isRunner && active && !offer.needsReconfirmation && offer.awaitingParty !== 'RUNNER';
  const roundsLeft = Math.max(0, offer.roundsLimit - offer.roundsUsed);
  const finalRound = active && !offer.needsReconfirmation && offer.awaitingParty !== 'NONE' && roundsLeft === 0;
  const canCounter = active && !offer.needsReconfirmation && myTurn && roundsLeft > 0;
  const canAcceptCounter = isRunner && active && !offer.needsReconfirmation && offer.awaitingParty === 'RUNNER';
  const errorMessage = isApiError(mutation.error)
    ? mutation.error.code === 'OFFER_VERSION_MISMATCH'
      ? 'The offer changed. The current terms are shown below.'
      : mutation.error.message
    : mutation.error instanceof Error ? mutation.error.message : null;
  const feedback = notice || errorMessage ? (
    <div ref={feedbackRef} className="grid gap-2 scroll-mt-24">
      {notice ? <Alert role="status">{notice}</Alert> : null}
      {errorMessage ? <Alert variant="danger" role="alert">{errorMessage}</Alert> : null}
    </div>
  ) : null;
  const openTermsForm = (action: 'edit' | 'counter') => {
    setAmountMinor(Math.round(offer.amountMinor / 100) * 100);
    setDuration(offer.durationMinutes);
    setMessage('');
    setNotice(null);
    setFormAction(action);
  };
  const submitTerms = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const durationMinutes = duration ?? 0;
    const maxMinutes = offer.maxDurationMinutes ?? DEFAULT_MAX_OFFER_MINUTES.TRANSIT;
    if (amountMinor === null || amountMinor < 100 || durationMinutes < 1 || durationMinutes > maxMinutes) {
      setNotice(`Enter a positive whole-naira amount and an estimated time between 1 minute and ${formatDuration(maxMinutes)}. The current system limits are checked when you submit.`);
      return;
    }
    const terms: OfferTerms = {
      amountMinor,
      durationMinutes,
      ...(message.trim() ? { message: message.trim() } : {}),
    };
    mutation.mutate({ action: formAction!, terms });
  };
  const statusLabel = !active
    ? offer.status.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
    : offer.needsReconfirmation ? 'Needs reconfirmation' : offer.awaitingParty === 'NONE' ? 'Terms agreed' : myTurn ? 'Your turn' : `Waiting for ${offer.awaitingParty.toLowerCase()}`;
  const statusTone = offer.status === 'SELECTED' || (active && offer.awaitingParty === 'NONE' && !offer.needsReconfirmation)
    ? 'bg-ok-bg text-ok' : active && (myTurn || offer.needsReconfirmation) ? 'bg-amber-bg text-amber' : active ? 'bg-blue-bg text-blue' : 'bg-panel text-muted';
  const backHref = isRunner ? '/offers' : `/errands/${offer.errandId}`;

  return (
    <main className="grid min-w-0 content-start gap-4 pb-10">
      <Link href={backHref} className="inline-flex w-fit items-center gap-2 text-xs font-bold text-green-900 hover:underline max-sm:hidden"><ArrowLeft aria-hidden="true" className="size-4" />{isRunner ? 'My offers' : 'Back to errand'}</Link>
      <PageHead
        eyebrow={active ? `Offer negotiation · ${offer.roundsUsed === 0 ? 'No counters yet' : `Round ${offer.roundsUsed} of ${offer.roundsLimit}`}` : 'Offer negotiation'}
        title={<span className="block max-w-[760px] break-words">{offer.errandTitle}</span>}
        description="Agree on a price and time using offers, counters and notes. Chat opens once the runner accepts the errand."
      />
      <JourneyHere />
      <OfferSentBanner offerId={offerId} />

      {active && !offer.needsReconfirmation && offer.awaitingParty !== 'NONE' ? (
        <Alert variant={myTurn ? 'info' : 'warn'} role="status">
          <Clock3 aria-hidden="true" className="mr-2 inline size-4" />
          {finalRound
            ? myTurn
              ? `Counter-offer limit reached (${offer.roundsLimit} of ${offer.roundsLimit}). ${isRunner ? 'Accept the latest price, or withdraw.' : 'Select this runner at the latest terms, or decline.'}`
              : `Counter-offer limit reached. The ${offer.awaitingParty.toLowerCase()} can now only accept or decline the latest terms.`
            : myTurn
              ? `It is your turn. ${roundsLeft} counter-offer${roundsLeft === 1 ? '' : 's'} left in this negotiation.`
              : `It is the ${offer.awaitingParty.toLowerCase()}'s turn. You cannot counter again until they answer. ${roundsLeft} counter-offer${roundsLeft === 1 ? '' : 's'} left.`}
        </Alert>
      ) : null}

      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <aside aria-label="Current terms and your actions" className="grid min-w-0 gap-4 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px] lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold text-ink">Current terms</h2>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone}`}>{statusLabel}</span>
          </div>
          <div className="rounded-[var(--r)] bg-tint p-4">
            <p className="text-xs font-semibold text-green-900">{active && offer.awaitingParty === 'NONE' && !offer.needsReconfirmation ? 'Agreed amount' : 'Latest offer amount'}</p>
            <p className="mt-2 break-words text-[36px] font-extrabold leading-none tracking-tight tabular-nums text-ink">{money(offer.amountMinor)}</p>
            <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-green-900"><Clock3 aria-hidden="true" className="size-3.5" />{formatDuration(offer.durationMinutes)} estimated time</p>
          </div>
          <div className="text-xs leading-relaxed text-muted" role="status">
            {active ? offer.needsReconfirmation
              ? <p>{isRunner ? 'The requester changed material errand details. Review them before confirming that your offer still stands.' : 'You changed material errand details. The runner must reconfirm before this offer can be selected.'}</p>
              : <p>{offer.awaitingParty === 'NONE' ? 'Both sides have agreed to these terms. The requester can now select the runner.' : myTurn ? 'It is your turn to respond.' : `Waiting for the ${offer.awaitingParty.toLowerCase()} to respond.`}</p>
              : offer.status === 'SELECTED' ? <p>The requester selected this offer. Open the assignment to review the next steps.</p>
                : <p>Offer status: {offer.status.toLowerCase().replaceAll('_', ' ')}. {closeReasonLabel(offer.closeReason)}</p>}
          </div>
          {!isRunner || active ? <Link href={isRunner ? `/marketplace/${offer.errandId}` : `/errands/${offer.errandId}`} className="inline-flex w-fit items-center gap-1 text-xs font-bold text-green-900 hover:underline">Review errand details<ArrowUpRight aria-hidden="true" className="size-3.5" /></Link> : null}
          {formAction ? null : feedback}
          <div className="grid gap-2 border-t border-line-2 pt-4" aria-label="Your actions">
            {offer.needsReconfirmation && isRunner && active ? <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: 'reconfirm' })}>Reconfirm offer</Button> : null}
            {canAcceptCounter ? <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: 'accept' })}>Accept {money(offer.amountMinor)}</Button> : null}
            {canEdit ? <Button type="button" variant="ghost" disabled={mutation.isPending} onClick={() => openTermsForm('edit')}>Edit offer</Button> : null}
            {canCounter ? <Button type="button" variant="ghost" disabled={mutation.isPending} onClick={() => openTermsForm('counter')}>Counter</Button> : null}
            {isRunner && active ? <Button type="button" variant="ghost" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: 'withdraw' })}>Withdraw offer</Button> : null}
            {!isRunner && active ? <Button type="button" variant="danger" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: 'reject' })}>Decline offer</Button> : null}
            {offer.status === 'SELECTED' && offer.assignmentId ? <Button asChild><Link href={`/assignments/${offer.assignmentId}`}>Open assignment</Link></Button> : null}
            {active && !offer.needsReconfirmation && offer.awaitingParty === 'NONE' && !isRunner ? <Button asChild><Link href={`/errands/${offer.errandId}`}>Review and select</Link></Button> : null}
            {!active && offer.status !== 'SELECTED' ? <p className="text-xs text-muted">This negotiation is read-only.</p> : null}
          </div>
          {formAction ? (
            <form className="grid min-w-0 gap-3 border-t border-line-2 pt-4" onSubmit={submitTerms}>
              <h3 className="text-sm font-extrabold text-ink">{formAction === 'edit' ? 'Edit your offer' : 'Make a counter-offer'}</h3>
              <div className="grid gap-1.5"><label className="text-xs font-bold text-ink-2" htmlFor="offer-amount">Amount</label><MoneyInput id="offer-amount" allowKobo={false} required value={amountMinor} onChange={setAmountMinor} autoComplete="off" /></div>
              <div className="grid gap-1.5"><span id="offer-duration-label" className="text-xs font-bold text-ink-2">Estimated duration</span><DurationInput id="offer-duration" value={duration} onChange={setDuration} maxMinutes={offer.maxDurationMinutes ?? DEFAULT_MAX_OFFER_MINUTES.TRANSIT} /></div>
              <ContactSharingNotice />
              <label className="grid gap-1.5"><span className="text-xs font-bold text-ink-2">Message (optional)</span><textarea maxLength={500} value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-20 w-full rounded-[var(--r)] border border-line bg-surface p-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-lime-600" /></label>
              {feedback}
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Sending…' : formAction === 'edit' ? 'Save offer' : 'Send counter'}</Button>
                <Button type="button" variant="ghost" onClick={() => setFormAction(null)}>Cancel</Button>
              </div>
            </form>
          ) : null}
          <p className="text-[11px] text-muted">Updated <time dateTime={offer.updatedAt}>{dateLabel(offer.updatedAt)}</time></p>
        </aside>

        <section className="min-w-0 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px] lg:col-start-1 lg:row-start-1" aria-labelledby="offer-history">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-2 pb-4">
            <div><h2 id="offer-history" className="flex items-center gap-2 text-base font-extrabold text-ink"><History aria-hidden="true" className="size-4 text-muted" />Price path</h2><p className="mt-1 text-xs text-muted">Every offer, counter and decision, in one place.</p></div>
            <span className="rounded-full bg-panel px-2.5 py-1 text-[11px] font-bold text-muted">{isRunner ? 'Runner view' : 'Requester view'}</span>
          </div>
          {offer.history.length ? <ol className="mt-4 grid gap-3" aria-label="Negotiation history">
            {offer.history.map((event) => {
              const own = event.actorUserId === session.me.id;
              const system = event.type === 'SYSTEM_EVENT';
              return (
                <li key={event.id} className={`min-w-0 rounded-[var(--r-sm)] p-3.5 sm:p-4 ${system ? 'border border-dashed border-line bg-surface' : own ? 'ml-4 bg-tint sm:ml-8' : 'mr-4 bg-panel sm:mr-8'}`}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-muted"><span className="font-extrabold text-ink-2">{system ? 'Errand update' : own ? 'You' : event.actorUserId === offer.runnerId ? 'Runner' : 'Requester'}</span><time dateTime={event.createdAt}>{dateLabel(event.createdAt)}</time></div>
                  <p className="whitespace-pre-wrap break-words text-sm font-semibold leading-relaxed text-ink">{eventDescription(event, session.me.id, offer)}</p>
                </li>
              );
            })}
          </ol> : <p className="py-8 text-center text-sm text-muted">No negotiation updates yet. You can still review the current terms.</p>}
          {offer.message && !offer.history.some((event) => event.message === offer.message) ? <div className="mt-4 rounded-[var(--r-sm)] bg-panel p-3.5"><h3 className="text-xs font-extrabold text-ink-2">Offer note</h3><p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink">{offer.message}</p></div> : null}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-line-2 pt-4 text-[11px] text-muted">
            <p>Sent <time dateTime={offer.createdAt}>{dateLabel(offer.createdAt)}</time></p>
            {offer.availabilityConfirmedAt ? <p>Availability confirmed <time dateTime={offer.availabilityConfirmedAt}>{dateLabel(offer.availabilityConfirmedAt)}</time></p> : null}
          </div>
        </section>
      </div>
      <div className="flex items-start gap-3 rounded-[var(--r)] bg-tint p-4 text-xs leading-relaxed text-green-900"><Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><p>{active ? 'Only the person whose turn it is can counter. Agreeing on terms does not start the errand; selection and runner acceptance come next.' : offer.status === 'SELECTED' ? 'Check the assignment for acceptance status and errand progress.' : 'Your offer history stays available here even after the negotiation closes.'}</p></div>
    </main>
  );
}
