'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { errandsApi } from '../api';

export function ErrandPublishedPage({ errandId }: { errandId: string }) {
  const [shareMessage, setShareMessage] = useState('');
  const errand = useQuery({
    queryKey: queryKeys.errands.detail(errandId),
    queryFn: () => errandsApi.get(errandId),
  });

  const copyLink = async () => {
    const url = `${window.location.origin}/errands/${errandId}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareMessage('Link copied. Share it with people you trust.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setShareMessage('Clipboard access was blocked. Open the errand and copy its URL from the address bar.');
        return;
      }
      setShareMessage('We could not copy the link. Please try again.');
    }
  };

  if (errand.isLoading) {
    return <div className="mx-auto grid max-w-5xl gap-4"><Skeleton className="h-12" /><Skeleton className="h-36 rounded-[var(--r-lg)]" /><Skeleton className="h-56 rounded-[var(--r-lg)]" /></div>;
  }
  if (errand.error || !errand.data) {
    return <Alert variant="danger" role="alert"><div className="grid gap-2"><p>We could not load the published errand.</p>{isApiError(errand.error) && errand.error.requestId ? <p className="text-xs">Request ID: {errand.error.requestId}</p> : null}<Button type="button" variant="ghost" onClick={() => void errand.refetch()}>Try again</Button></div></Alert>;
  }

  const currentErrand = errand.data;
  return (
    <div className="mx-auto grid max-w-5xl gap-5">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-wider text-green-700">Errand posted</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">Your errand is live</h1>
        <p className="mt-1 text-sm text-muted">Nearby runners were notified. Offers appear as they arrive.</p>
      </header>
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--r-lg)] border border-line bg-tint p-5">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-green-800">{currentErrand.status.replace('_', ' ')}</p>
          <h2 className="mt-1 text-xl font-extrabold text-ink">{currentErrand.title}</h2>
          <p className="mt-1 text-sm text-muted">{currentErrand.category.name} · {currentErrand.offerCount} offers</p>
        </div>
        {currentErrand.expiresAt ? <p className="text-sm font-semibold text-ink">Closes {new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' }).format(new Date(currentErrand.expiresAt))}</p> : null}
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="grid content-start gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4">
          <h2 className="font-extrabold text-ink">What happens next</h2>
          <p className="text-sm text-muted">Runners nearby can review the approximate areas and send offers. Compare their details and agree on a price before work starts.</p>
          <Button type="button" variant="soft" onClick={() => void copyLink()}>Copy errand link</Button>
          {shareMessage ? <p role="status" className="text-xs text-muted">{shareMessage}</p> : null}
        </section>
        <section className="grid content-start gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4">
          <h2 className="font-extrabold text-ink">Manage</h2>
          <Link href={`/errands/${errandId}`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-green-800 px-4 text-sm font-bold text-white hover:bg-green-900">View errand</Link>
          <Link href="/pricing#errand-boost" className="inline-flex min-h-11 items-center justify-center rounded-full bg-surface px-4 text-sm font-bold text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-panel">Boost · optional</Link>
          <Link href="/errands" className="text-center text-sm font-bold text-green-800 underline">My errands</Link>
        </section>
      </div>
    </div>
  );
}
