'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@urgent/ui';
import { createShare, dateText, errorText, listShares, revokeShare, shareKeys, type CreatedShare } from './api';

export function ShareManagementPage({ errandId }: { errandId: string }) {
  const client = useQueryClient();
  const links = useQuery({ queryKey: shareKeys.list(errandId), queryFn: () => listShares(errandId), retry: false, refetchInterval: 30_000 });
  const intent = useRef<string | null>(null);
  const lock = useRef(false);
  const [secret, setSecret] = useState<CreatedShare | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [copy, setCopy] = useState('');
  async function create() {
    if (lock.current) return;
    lock.current = true; setPending(true); setError('');
    intent.current ??= crypto.randomUUID();
    try {
      const result = await createShare(errandId, intent.current);
      setSecret(result); setCopy(''); intent.current = null;
      void client.invalidateQueries({ queryKey: shareKeys.list(errandId) });
    } catch (cause) { setError(errorText(cause)); }
    finally { lock.current = false; setPending(false); }
  }
  async function revoke(id: string) {
    if (lock.current) return;
    lock.current = true; setPending(true); setError('');
    try {
      await revokeShare(id);
      if (secret?.id === id) setSecret(null);
      void client.invalidateQueries({ queryKey: shareKeys.list(errandId) });
    } catch (cause) { setError(errorText(cause)); }
    finally { lock.current = false; setPending(false); }
  }
  const url = secret && typeof window !== 'undefined' ? `${window.location.origin}/shared/${encodeURIComponent(secret.token)}` : '';
  return <main className="mx-auto w-full max-w-3xl space-y-6">
    <Link href="/dashboard" className="text-sm font-bold text-green-800">← Dashboard</Link>
    <header><p className="text-xs font-extrabold uppercase tracking-wide text-green-800">Trusted contact</p><h1 className="mt-1 text-3xl font-extrabold">Share errand progress</h1><p className="mt-3 text-sm text-muted">A read-only safety view for someone you trust. Approximate location only.</p></header>
    <section className="space-y-4 rounded-[var(--r-lg)] border border-line bg-surface p-5 shadow-[var(--shadow)]">
      <h2 className="text-xl font-semibold">Trusted link</h2>
      <p>Anyone with a link can see progress. Exact addresses, phone numbers and private messages are not shared. Links expire at the time shown or when the errand ends.</p>
      {secret ? <div className="space-y-3">
        <p className="font-semibold">Save this link now. It is shown only once.</p>
        <label className="block" htmlFor="trusted-link">Private sharing link</label>
        <input id="trusted-link" readOnly value={url} className="w-full min-w-0 rounded-xl border border-line p-3 text-sm" />
        <p>Expires {dateText(secret.expiresAt)}</p>
        <div className="flex flex-wrap gap-3"><Button onClick={async () => { try { await navigator.clipboard.writeText(url); setCopy('Link copied.'); } catch { setCopy('Could not copy. Select and copy the link above.'); } }}>Copy link</Button>
          <Button variant="ghost" onClick={() => { setSecret(null); setCopy(''); }}>Dismiss link</Button></div>
        <p role="status">{copy}</p>
      </div> : <Button disabled={pending || links.isPending || links.isError} onClick={() => void create()}>{pending ? 'Working…' : 'Create link'}</Button>}
      {error && <p role="alert">{error}</p>}
    </section>
    <section className="space-y-4"><h2 className="text-xl font-semibold">Your sharing links</h2>
      {links.isPending && <p role="status">Loading links…</p>}
      {links.isError && <div role="alert"><p>{errorText(links.error)}</p><Button variant="ghost" onClick={() => void links.refetch()}>Retry</Button></div>}
      {links.data?.length === 0 && <p>No links yet. Create a link to share this errand with someone you trust.</p>}
      {links.data?.map(link => <article key={link.id} className="space-y-2 rounded-[var(--r-lg)] border border-line bg-surface p-5 shadow-[var(--shadow)]">
        <h3 className="font-semibold">{link.status} · {link.createdByMe ? 'Created by you' : 'Shared by another participant'}</h3>
        <p>Expires {dateText(link.expiresAt)}</p><p>{link.viewCount} views{link.lastViewedAt ? ` · Last viewed ${dateText(link.lastViewedAt)}` : ''}</p>
        {link.concernRaisedAt && <p>A concern was raised {dateText(link.concernRaisedAt)}</p>}
        {link.createdByMe && ['ACTIVE', 'CREATED'].includes(link.status) && <Button variant="ghost" disabled={pending} onClick={() => void revoke(link.id)}>Revoke link</Button>}
      </article>)}
    </section>
  </main>;
}
