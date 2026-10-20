'use client';

import { PageLoading } from '@/components/shell/page-loading';
import { PageHead } from '@/components/shell/page-head';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { queryKeys } from '@/lib/query/keys';
import { errandsApi } from '../api';
import { PushOptInPrompt } from '@/features/push/push-opt-in-prompt';

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

  if (errand.isPending) {
    return <PageLoading title="Your errand is live" eyebrow="Requester" width="max-w-5xl" />;
  }
  if (errand.error || !errand.data) {
    return <div className="grid min-w-0 content-start gap-4 pb-10"><Alert variant="danger" role="alert"><div className="grid gap-2"><p>We could not load the published errand.</p><Button type="button" variant="ghost" onClick={() => void errand.refetch()}>Try again</Button></div></Alert></div>;
  }

  const currentErrand = errand.data;
  return (
    <div className="grid min-w-0 content-start gap-4 pb-10">
      <PageHead
        eyebrow="Errand posted"
        title="Your errand is live"
        description="Nearby runners were notified. Offers appear as they arrive."
      />
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 content-start gap-4">
          <section className="flex min-w-0 flex-wrap items-center justify-between gap-4 rounded-[var(--r-lg)] bg-tint p-4 sm:p-[22px]">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-green-800">{currentErrand.status.replace('_', ' ')}</p>
              <h2 className="mt-1 text-xl font-extrabold text-ink">{currentErrand.title}</h2>
              <p className="mt-1 text-sm text-muted">{currentErrand.category.name} · {currentErrand.offerCount} offers</p>
            </div>
            {currentErrand.expiresAt ? <p className="text-sm font-semibold text-ink">Closes {new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' }).format(new Date(currentErrand.expiresAt))}</p> : null}
          </section>
          <PushOptInPrompt />
        </div>
        <aside className="grid min-w-0 content-start gap-4 lg:sticky lg:top-6">
          <section className="grid min-w-0 content-start gap-3 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
            <h2 className="font-extrabold text-ink">What happens next</h2>
            <p className="text-sm text-muted">Runners nearby can review the approximate areas and send offers. Compare their details and agree on a price before work starts.</p>
            <Button type="button" variant="soft" onClick={() => void copyLink()}>Copy errand link</Button>
            {shareMessage ? <p role="status" className="text-xs text-muted">{shareMessage}</p> : null}
          </section>
          <section className="grid min-w-0 content-start gap-3 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
            <h2 className="font-extrabold text-ink">Manage</h2>
            <Link href={`/errands/${errandId}`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-green-800 px-4 text-sm font-bold text-white hover:bg-green-900">View errand</Link>
            <Link href={`/boosts?errandId=${errandId}`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-surface px-4 text-sm font-bold text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-panel">Boost · optional</Link>
            <Link href="/errands" className="text-center text-sm font-bold text-green-800 underline">My errands</Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
