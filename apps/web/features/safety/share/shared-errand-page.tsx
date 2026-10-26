'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button, Skeleton } from '@urgent/ui';
import { MapProvider } from '@/components/map/MapProvider';
import { dateText, errorText, getShared, raiseConcern, shareKeys, unavailable } from './api';

// The map code loads only when there is a pin to show.
const RoundedLiveLocationMap = dynamic(
  () => import('@/features/location/track/rounded-live-location-map').then((module) => module.RoundedLiveLocationMap),
  { ssr: false, loading: () => <Skeleton className="h-64 rounded-[var(--r)]" aria-label="Loading map" /> },
);

const panel = 'space-y-4 rounded-[var(--r-lg)] border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6';
const labels: Record<string, string> = { ACCEPTED: 'Runner accepted', IN_PROGRESS: 'On the way to pickup', PICKED_UP: 'On the way to drop-off', DELIVERED: 'Delivered', COMPLETED: 'Completed', CANCELLED: 'Cancelled', DISPUTED: 'Disputed — under review' };
/** A service is work at one address, so its steps read as work started and finished. */
const serviceLabels: Record<string, string> = { ...labels, IN_PROGRESS: 'On the way', PICKED_UP: 'Work in progress', DELIVERED: 'Work finished' };
export function SharedErrandPage({ token }: { token: string }) {
  // The sensitive trusted-contact family is never persisted; discard it on unmount as well.
  const query = useQuery({ queryKey: shareKeys.public(token), queryFn: ({ signal }) => getShared(token, signal), retry: false, refetchInterval: 30_000, gcTime: 0 });
  const data = query.data;
  const [missing, setMissing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [concernError, setConcernError] = useState('');
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(clock);
  }, []);
  const expired = data && (!Number.isFinite(Date.parse(data.linkExpiresAt)) || Date.parse(data.linkExpiresAt) <= now);
  if (missing || expired || unavailable(query.error)) return <main className="mx-auto max-w-xl space-y-4 p-8"><h1 className="text-3xl font-bold">This link is unavailable</h1><p>Ask the person who shared it for a new link.</p></main>;
  if (query.error) return <main className="mx-auto max-w-xl space-y-4 p-8"><h1 className="text-2xl font-bold">Unable to load progress</h1><p role="alert">{errorText(query.error)}</p><Button onClick={() => void query.refetch()}>Retry</Button></main>;
  if (!data) return <main className="mx-auto max-w-5xl p-8" role="status"><div className="h-64 animate-pulse rounded-2xl bg-panel" />Loading shared progress…</main>;
  const live = data.live;
  const age = live?.capturedAt ? now - Date.parse(live.capturedAt) : Infinity;
  const showPoint = ['IN_PROGRESS', 'PICKED_UP'].includes(data.status) && live && ['FRESH', 'STALE'].includes(live.freshness) && age >= -60_000 && age < 15 * 60_000 && typeof live.lat === 'number' && typeof live.lng === 'number' && Math.abs(live.lat) <= 90 && Math.abs(live.lng) <= 180;
  const stale = live?.freshness === 'STALE' || age > 90_000;
  const service = data.categoryFlow === 'SERVICE';
  const statusLabels = service ? serviceLabels : labels;
  return <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-8">
    <header className="flex flex-wrap items-center justify-between gap-3"><Link href="/" className="text-2xl font-extrabold">Urgent.ng</Link><span className="rounded-full bg-lime/20 px-4 py-2 text-sm">Trusted contact · Read-only</span></header>
    <div><h1 className="text-3xl font-bold">Shared errand progress</h1><p className="mt-2 text-muted">Exact addresses, phone numbers and private messages are never shown here.</p></div>
    <div className="grid gap-5 md:grid-cols-[1.5fr_1fr]"><div className="space-y-5">
      <section className={panel}><h2 className="text-xl font-semibold">{service ? 'Where' : 'Approximate location'}</h2>
        {/* A service is at one address, so there is no runner to follow and no map: just the area. */}
        {service ? null : showPoint ? <><MapProvider><RoundedLiveLocationMap point={{ lat: live.lat as number, lng: live.lng as number }} /></MapProvider><p>{stale ? 'Location may be out of date.' : 'Approximate runner location.'}</p><p className="text-sm text-muted">Position captured {dateText(live.capturedAt!)}</p></> : <p>No recent location is available. A pin appears only while the runner shares a recent position.</p>}
        <dl className="space-y-3">{service ? null : <div><dt className="text-sm text-muted">Pickup area</dt><dd>{data.pickup?.area || 'Not available'}</dd></div>}<div><dt className="text-sm text-muted">{service ? 'Service area' : 'Drop-off area'}</dt><dd>{data.destination?.area || 'Not available'}</dd></div></dl>
      </section>
      <section className={panel}><h2 className="text-xl font-semibold">{statusLabels[data.status] || 'Errand update'}</h2><p>{service ? 'Expected finish' : 'Expected delivery'}: {data.expectedDeliveryAt ? dateText(data.expectedDeliveryAt) : 'Not available yet'}</p>
        <ol className="space-y-3">{data.checkpoints.filter(point => ['PICKED_UP', 'DELIVERED'].includes(point.type)).map((point, index) => <li key={index}>{point.type === 'PICKED_UP' ? (service ? 'Work started' : 'Item picked up') : (service ? 'Work finished' : 'Delivered')} · {dateText(point.at)}</li>)}</ol>
        <p className="text-sm text-muted">Last update: {dateText(data.lastUpdatedAt)} · Refreshes every 30 seconds</p>
      </section>
    </div><aside className="space-y-5">
      <section className={panel}><h2 className="text-xl font-semibold">Your runner</h2><p className="font-semibold">{data.runner.firstName} {data.runner.lastInitial.slice(0, 1)}.</p>{data.runner.verified && <p>Identity verified</p>}<p>Shared by {data.requesterFirstName}</p><p className="text-sm text-muted">Link expires {dateText(data.linkExpiresAt)}</p></section>
      <section className={panel}><h2 className="text-xl font-semibold">Report a concern</h2><p className="text-sm">In immediate danger? Contact local emergency services first. This form is not an emergency service.</p>
        {sent ? <p role="status">Concern received. The safety team will review it.</p> : <form className="space-y-3" onSubmit={async event => {
          event.preventDefault(); if (lock.current) return; lock.current = true; setPending(true); setConcernError('');
          try { const result = await raiseConcern(token, { message: message.trim() || undefined }); if (result.received) { setSent(true); setMessage(''); } else setConcernError('Concern was not received. Please try again.'); }
          catch (cause) { if (unavailable(cause)) setMissing(true); else setConcernError(errorText(cause)); }
          finally { lock.current = false; setPending(false); }
        }}><label htmlFor="concern-details" className="block text-sm font-semibold">Details (optional)</label><textarea id="concern-details" className="min-h-28 w-full rounded-xl border border-line p-3" value={message} maxLength={500} onChange={event => setMessage(event.target.value)} /><p className="text-sm text-muted">{message.length}/500</p>{concernError && <p role="alert">{concernError}</p>}<Button type="submit" disabled={pending}>{pending ? 'Sending…' : 'Send concern'}</Button></form>}
      </section>
    </aside></div>
  </main>;
}
