'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MessageCircle, RefreshCw } from 'lucide-react';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { isApiError } from '@/lib/api/client';
import { useSession } from '@/lib/auth/client';
import { queryKeys } from '@/lib/query/keys';
import { offersApi, type OfferNegotiation, type OfferTerms } from '../api';

type Action = 'edit' | 'counter' | 'accept' | 'reject' | 'withdraw' | 'reconfirm';

const money = (minor: number | null) =>
  minor === null
    ? null
    : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(minor / 100);

function closeReasonLabel(reason: string | null) {
  if (!reason) return 'This offer is closed.';
  return reason.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function eventDescription(event: OfferNegotiation['history'][number], currentUserId: string, offer: OfferNegotiation) {
  if (event.type === 'SYSTEM_EVENT') {
    return event.message === 'ERRAND_EDITED' ? 'The errand was materially updated. The runner must reconfirm.' : 'Offer reconfirmed.';
  }
  if (event.type === 'ACCEPT') return 'Accepted the latest counter-offer.';
  if (event.type === 'REJECT') return 'Declined the offer.';
  if (event.type === 'WITHDRAW') return 'Withdrew the offer.';
  const party = event.actorUserId === currentUserId ? 'You' : event.actorUserId === offer.runnerId ? 'Runner' : 'Requester';
  const terms = [
    event.amountMinor === null ? null : money(event.amountMinor),
    event.durationMinutes === null ? null : `${event.durationMinutes} min`,
  ].filter(Boolean).join(' · ');
  return `${party} ${event.type === 'INITIAL_OFFER' ? 'offered' : 'countered'}${terms ? ` ${terms}` : ''}${event.message ? ` — “${event.message}”` : ''}`;
}

export function OfferNegotiationPage({ offerId }: { offerId: string }) {
  const session = useSession();
  const client = useQueryClient();
  const [formAction, setFormAction] = useState<'edit' | 'counter' | null>(null);
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('30');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const queryKey = queryKeys.offers.detail(offerId);
  const query = useQuery({
    queryKey,
    queryFn: () => offersApi.negotiation(offerId),
  });
  const mutation = useMutation({
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
    },
  });

  if (query.isLoading) return <div className="mx-auto grid max-w-5xl gap-4"><Skeleton className="h-12" /><Skeleton className="h-72 rounded-[var(--r-lg)]" /></div>;
  if (query.error || !query.data) {
    return (
      <main className="mx-auto max-w-4xl">
        <Link href="/offers" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-green-800"><ArrowLeft aria-hidden="true" className="size-4" />My offers</Link>
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
  const canCounter = active && !offer.needsReconfirmation && myTurn;
  const canAcceptCounter = isRunner && active && !offer.needsReconfirmation && offer.awaitingParty === 'RUNNER';
  const errorMessage = isApiError(mutation.error)
    ? mutation.error.code === 'OFFER_VERSION_MISMATCH'
      ? 'The offer changed. The current terms are shown below.'
      : mutation.error.message
    : mutation.error instanceof Error ? mutation.error.message : null;
  const openTermsForm = (action: 'edit' | 'counter') => {
    setAmount(String(Math.round(offer.amountMinor / 100)));
    setDuration(String(offer.durationMinutes));
    setMessage('');
    setNotice(null);
    setFormAction(action);
  };
  const submitTerms = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const naira = Number(amount);
    const durationMinutes = Number(duration);
    if (!Number.isSafeInteger(naira) || naira < 1 || !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440) {
      setNotice('Enter a positive whole-naira amount and an estimated time between 1 minute and 24 hours. The current system limits are checked when you submit.');
      return;
    }
    const terms: OfferTerms = {
      amountMinor: naira * 100,
      durationMinutes,
      ...(message.trim() ? { message: message.trim() } : {}),
    };
    mutation.mutate({ action: formAction!, terms });
  };

  return (
    <main className="mx-auto grid max-w-5xl gap-4">
      <Link href="/offers" className="inline-flex w-fit items-center gap-2 text-sm font-bold text-green-800 hover:underline"><ArrowLeft aria-hidden="true" className="size-4" />My offers</Link>
      <header className="rounded-[var(--r-lg)] border border-line bg-tint p-4 shadow-[var(--shadow)] sm:p-6">
        <p className="text-xs font-extrabold uppercase tracking-wide text-green-800">Offer negotiation</p>
        <h1 className="mt-2 text-2xl font-extrabold text-ink sm:text-3xl">{offer.errandTitle}</h1>
        <p className="mt-2 text-sm text-muted">{money(offer.amountMinor)} · {offer.durationMinutes} min estimated time</p>
      </header>

      {notice ? <Alert role="status">{notice}</Alert> : null}
      {errorMessage ? <Alert variant="danger" role="alert">{errorMessage}</Alert> : null}

      {offer.needsReconfirmation ? (
        <Alert variant="warn" role="status">The requester changed material errand details. Review them before confirming that your offer still stands.</Alert>
      ) : null}
      {active && !offer.needsReconfirmation ? (
        <Alert variant={myTurn ? 'info' : 'warn'} role="status">
          {offer.awaitingParty === 'NONE'
            ? 'Both sides have agreed to these terms. The requester can now select the runner.'
            : myTurn ? 'It is your turn to respond.' : `Waiting for the ${offer.awaitingParty.toLowerCase()} to respond.`}
        </Alert>
      ) : !active ? <Alert role="status">Offer status: {offer.status.toLowerCase().replaceAll('_', ' ')}. {closeReasonLabel(offer.closeReason)}</Alert> : null}

      <section className="rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-5" aria-labelledby="offer-history">
        <div className="flex items-center justify-between gap-3">
          <div><h2 id="offer-history" className="text-base font-extrabold text-ink">Price path</h2><p className="mt-1 text-sm text-muted">Both parties see the same negotiation history.</p></div>
          {offer.conversationId ? <Button asChild variant="ghost" size="sm"><Link href={`/conversations/${offer.conversationId}`}><MessageCircle aria-hidden="true" className="mr-2 size-4" />Open chat</Link></Button> : null}
        </div>
        <ol className="mt-4 grid gap-3">
          {offer.history.map((event) => (
            <li key={event.id} className={`rounded-[var(--r)] p-3 ${event.actorUserId === session.me.id ? 'ml-4 bg-green-bg sm:ml-12' : 'mr-4 bg-panel sm:mr-12'}`}>
              <p className="text-sm font-semibold text-ink">{eventDescription(event, session.me.id, offer)}</p>
              <time className="mt-1 block text-xs text-muted" dateTime={event.createdAt}>{new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.createdAt))}</time>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-5">
        <h2 className="text-base font-extrabold text-ink">Your actions</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {offer.needsReconfirmation && isRunner && active ? <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: 'reconfirm' })}>Reconfirm offer</Button> : null}
          {canAcceptCounter ? <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: 'accept' })}>Accept {money(offer.amountMinor)}</Button> : null}
          {canEdit ? <Button type="button" variant="ghost" onClick={() => openTermsForm('edit')}>Edit offer</Button> : null}
          {canCounter ? <Button type="button" variant="ghost" onClick={() => openTermsForm('counter')}>Counter</Button> : null}
          {isRunner && active ? <Button type="button" variant="ghost" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: 'withdraw' })}>Withdraw offer</Button> : null}
          {!isRunner && active ? <Button type="button" variant="danger" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: 'reject' })}>Decline offer</Button> : null}
          {offer.status === 'SELECTED' && offer.assignmentId ? <Button asChild><Link href={`/assignments/${offer.assignmentId}`}>Open assignment</Link></Button> : null}
          {offer.status === 'ACTIVE' && offer.awaitingParty === 'NONE' && !isRunner ? <Button asChild><Link href={`/errands/${offer.errandId}`}>Review and select</Link></Button> : null}
        </div>
        {formAction ? (
          <form className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2" onSubmit={submitTerms}>
            <div className="grid gap-1"><label className="text-xs font-bold text-muted" htmlFor="offer-amount">Amount (NGN)</label><input id="offer-amount" inputMode="numeric" type="number" min={1} step={1} required value={amount} onChange={(event) => setAmount(event.target.value)} className="min-h-11 rounded-[var(--r)] border border-line px-3 text-sm" /></div>
            <div className="grid gap-1"><label className="text-xs font-bold text-muted" htmlFor="offer-duration">Estimated duration (minutes)</label><input id="offer-duration" type="number" min={1} max={1440} step={1} required value={duration} onChange={(event) => setDuration(event.target.value)} className="min-h-11 rounded-[var(--r)] border border-line px-3 text-sm" /></div>
            <p className="text-xs text-muted sm:col-span-2">The current system offer amount and duration limits are validated when you submit.</p>
            <label className="grid gap-1 sm:col-span-2"><span className="text-xs font-bold text-muted">Message (optional)</span><textarea maxLength={500} value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-20 rounded-[var(--r)] border border-line p-3 text-sm" /></label>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Sending…' : formAction === 'edit' ? 'Save offer' : 'Send counter'}</Button>
              <Button type="button" variant="ghost" onClick={() => setFormAction(null)}>Cancel</Button>
            </div>
          </form>
        ) : null}
      </section>
    </main>
  );
}
