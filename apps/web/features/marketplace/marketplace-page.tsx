'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { MarketplaceFeedPage } from './feed/marketplace-feed-page';
import { PageHead } from '@/components/shell/page-head';
import type { RunnerEligibility } from '@/features/runner/api';

// The map and its SDK load only when the map view is opened, so the feed's first-load JavaScript
// does not carry them.
const MarketplaceMapView = dynamic(
  () => import('./map/marketplace-map-view').then((module) => module.MarketplaceMapView),
  { ssr: false, loading: () => <Skeleton className="h-96 rounded-[var(--r)]" aria-label="Loading map" /> },
);

export function MarketplacePage({ eligibility }: { eligibility: RunnerEligibility }) {
  const searchParams = useSearchParams();
  if (!eligibility.canBrowseFeed) {
    return <MarketplaceEligibilityGate eligibility={eligibility} />;
  }
  return searchParams.get('view') === 'map' ? <MarketplaceMapView /> : <MarketplaceFeedPage />;
}

export function MarketplaceEligibilityError({ requestId }: { requestId?: string }) {
  const router = useRouter();

  return (
    <main className="grid min-w-0 content-start gap-4 pb-10">
      <PageHead eyebrow="Marketplace" title="Check runner eligibility" />
      <Alert variant="danger" role="alert">
        <div className="grid gap-2">
          <p>We could not confirm that you can browse the marketplace. Try checking again.</p>
          <Button type="button" variant="ghost" className="w-fit" onClick={() => router.refresh()}>Check again</Button>
        </div>
      </Alert>
    </main>
  );
}

function MarketplaceEligibilityGate({ eligibility }: { eligibility: RunnerEligibility }) {
  const reasons = eligibility.reasons;
  const verificationRequired = reasons.includes('NOT_VERIFIED') || reasons.includes('PHONE_NOT_VERIFIED');
  const verificationPending = reasons.includes('VERIFICATION_PENDING');
  const profileRequired = reasons.includes('NO_RUNNER_PROFILE') || reasons.some((reason) => reason === 'OPERATING_AREA_REQUIRED') || reasons.includes('UNAVAILABLE');
  const accountRestricted = reasons.includes('RESTRICTED') || reasons.includes('ACCOUNT_NOT_ACTIVE');
  const title = verificationPending && !verificationRequired
    ? 'Your verification is in progress'
    : accountRestricted
      ? 'Your account needs attention'
      : profileRequired && !verificationRequired
        ? 'Set up your runner profile'
        : 'Your next errand starts here';
  const description = verificationRequired
    ? 'Complete runner verification to browse nearby errands and send offers. It helps requesters know who they can trust.'
    : verificationPending
      ? 'Your identity check is being reviewed. You can check its progress any time.'
      : accountRestricted
        ? 'Resolve the account requirements below before browsing runner errands.'
        : 'Set up your runner profile and availability to browse nearby errands.';
  const action = verificationRequired || verificationPending
    ? { href: '/verification', label: verificationRequired ? 'Continue verification' : 'View verification' }
    : accountRestricted
      ? { href: '/account/standing', label: 'View account standing' }
      : { href: '/runner/profile', label: 'Set up runner profile' };
  const messages: Record<string, string> = {
    ACCOUNT_NOT_ACTIVE: 'Your account is not active for runner tasks.',
    PHONE_NOT_VERIFIED: 'Verify your phone number before browsing runner errands.',
    NOT_VERIFIED: 'Complete identity verification before browsing runner errands.',
    VERIFICATION_PENDING: 'Your identity check is still being reviewed.',
    NO_RUNNER_PROFILE: 'Set up your operating area and travel preferences.',
    OPERATING_AREA_REQUIRED: 'Confirm your operating area and save your runner profile.',
    UNAVAILABLE: 'Set your runner availability to available.',
    RESTRICTED: 'An account restriction currently prevents marketplace access.',
  };

  return (
    <main className="grid min-w-0 content-start gap-4 pb-10">
      <PageHead eyebrow="Marketplace" title="Find errands near you" />
      <section aria-labelledby="marketplace-eligibility-title" className="overflow-hidden rounded-[var(--r-lg)] bg-surface shadow-[var(--shadow)]">
        <div className="grid items-center gap-6 bg-gradient-to-br from-tint to-surface p-6 sm:grid-cols-[minmax(0,1fr)_180px] sm:p-8 lg:p-10">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-green-800">
              <ShieldCheck aria-hidden="true" className="size-4" />
              Runner account check
            </span>
            <h2 id="marketplace-eligibility-title" className="mt-4 text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">{title}</h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-2">{description}</p>
            {reasons.length > 0 ? (
              <ul className="mt-4 grid max-w-lg gap-2 text-sm text-ink-2">
                {reasons.map((reason) => <li key={reason}>{messages[reason] ?? 'Your runner account is not currently eligible to browse.'}</li>)}
              </ul>
            ) : null}
            <Button asChild className="mt-5">
              <Link href={action.href}>{action.label}<ArrowRight aria-hidden="true" /></Link>
            </Button>
          </div>
          <Image src="/assets/mascot.png" alt="" width={180} height={190} className="row-start-1 mx-auto h-36 w-auto sm:col-start-2 sm:row-start-1 sm:h-48" />
        </div>
      </section>
    </main>
  );
}
