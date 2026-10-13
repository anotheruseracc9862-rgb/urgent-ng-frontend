'use client';

import Link from 'next/link';
import {
  ArrowUpRight,
  Check,
  CircleCheck,
  Clock3,
  ChevronRight,
  MapPin,
  Package,
  Repeat2,
  Star,
  Tag,
  Truck,
  Zap,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { Alert, Button, Card, CardDescription, CardHeader, CardTitle, Skeleton } from '@urgent/ui';
import { formatDate } from '@urgent/utils';
import { useSession } from '@/lib/auth/client';
import { api, isApiError } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';
import { queryKeys } from '@/lib/query/keys';
import type { ShellMode } from '@/components/shell/nav-items';
import { ModeNudge } from './mode-nudge';

type Summary = components['schemas']['MeSummaryDto'];
type ErrandSummary = components['schemas']['ErrandSummaryDto'];
type Assignment = components['schemas']['RunnerAssignmentSummaryDto'];
type FeedItem = components['schemas']['FeedItemDto'];
type OfferLimit = components['schemas']['RunnerOfferLimitDto'];
type Performance = components['schemas']['RunnerPerformanceDto'];
type RunnerProfile = components['schemas']['RunnerProfileDto'];
type RunnerEligibility = components['schemas']['RunnerEligibilityDto'];
type MetricIcon = typeof Package;
type MetricTone = 'green' | 'amber' | 'blue' | 'violet';

const money = (minor: number | null) =>
  minor === null ? 'No budget' : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(minor / 100);

function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <Alert variant="danger" role="alert">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>We could not load this dashboard section.</span>
        <Button type="button" variant="ghost" size="sm" onClick={onRetry}>Retry</Button>
      </div>
      {isApiError(error) && error.requestId && <p className="mt-1 text-xs">Request ID: {error.requestId}</p>}
    </Alert>
  );
}

function Stat({
  value,
  label,
  href,
  icon: Icon,
  tone = 'green',
  badge,
}: {
  value: string | number;
  label: string;
  href?: string;
  icon: MetricIcon;
  tone?: MetricTone;
  badge?: string;
}) {
  const className = 'grid min-h-[140px] content-between gap-3 rounded-[var(--r-lg)] bg-surface p-5 shadow-[var(--shadow)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-16px_rgba(23,33,46,.26)]';
  const toneClass = {
    green: 'bg-tint-2 text-green-900',
    amber: 'bg-amber-bg text-amber',
    blue: 'bg-blue-bg text-blue',
    violet: 'bg-violet-bg text-violet',
  }[tone];
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className={`grid size-10 place-items-center rounded-[13px] ${toneClass}`}><Icon aria-hidden="true" className="size-5" /></span>
        {badge ? <span className="rounded-full bg-ok-bg px-2.5 py-1 text-[10px] font-extrabold text-ok">{badge}</span> : null}
      </div>
      <div>
        <strong className="block text-[32px] font-extrabold leading-none tracking-tight text-ink">{value}</strong>
        <span className="mt-2 block text-[12.5px] font-semibold text-muted">{label}</span>
      </div>
    </>
  );
  return href ? <Link href={href} className={className}>{content}</Link> : <div className={className}>{content}</div>;
}

function IconChip({ children, tone = 'green' }: { children: React.ReactNode; tone?: MetricTone }) {
  const toneClass = {
    green: 'bg-tint-2 text-green-900',
    amber: 'bg-amber-bg text-amber',
    blue: 'bg-blue-bg text-blue',
    violet: 'bg-violet-bg text-violet',
  }[tone];
  return <span className={`grid size-10 shrink-0 place-items-center rounded-[13px] ${toneClass}`}>{children}</span>;
}

function Gauge({ value, label, dark = false }: { value: number | null; label: string; dark?: boolean }) {
  const progress = value === null ? 0 : Math.max(0, Math.min(100, value));
  const circumference = 267;
  return (
    <div className="relative mx-auto w-full max-w-[250px]" role="img" aria-label={value === null ? label : `${Math.round(value)} percent. ${label}`}>
      <svg aria-hidden="true" viewBox="0 0 200 110" className="block w-full">
        <path d="M 15 100 A 85 85 0 0 1 185 100" fill="none" stroke={dark ? '#344154' : '#e7ebe3'} strokeWidth="14" strokeLinecap="round" />
        {value !== null && <path d="M 15 100 A 85 85 0 0 1 185 100" fill="none" stroke={dark ? '#a6d445' : '#668a00'} strokeWidth="14" strokeLinecap="round" strokeDasharray={`${circumference * progress / 100} ${circumference}`} />}
      </svg>
      <div className={`absolute inset-x-0 bottom-1 text-center ${dark ? 'text-white' : 'text-ink'}`}>
        <strong className="block text-[30px] font-extrabold leading-none tracking-tight">{value === null ? '—' : `${Math.round(value)}%`}</strong>
        <span className={`mt-1 block text-[11px] font-semibold ${dark ? 'text-white/70' : 'text-muted'}`}>{label}</span>
      </div>
    </div>
  );
}

function TaskProgress({ status }: { status: string }) {
  const labels = ['Accepted', 'Pickup', 'Delivery', 'Done'];
  const currentStep = status === 'PICKED_UP' ? 2 : status === 'DELIVERED' ? 3 : status === 'COMPLETED' ? 4 : 1;
  return (
    <ol aria-label={`Task progress: ${status.replaceAll('_', ' ').toLowerCase()}`} className="grid grid-cols-4 gap-1.5">
      {labels.map((label, index) => (
        <li key={label} className="grid min-w-0 gap-1.5">
          <span className={`h-1.5 rounded-full ${index < currentStep ? 'bg-lime-600' : index === currentStep ? 'bg-ink' : 'bg-line'}`} />
          <span className={`truncate text-[10px] font-semibold ${index === currentStep ? 'text-ink' : 'text-muted'}`}>{label}</span>
        </li>
      ))}
    </ol>
  );
}

function SectionEmpty({ children, href, action }: { children: string; href: string; action: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-panel/60 px-4 py-6 text-center">
      <p className="text-sm text-muted">{children}</p>
      <Link href={href} className="mt-3 inline-flex min-h-10 items-center rounded-full bg-ink px-4 text-xs font-bold text-white hover:bg-[#0f1822]">{action}</Link>
    </div>
  );
}

export function DashboardPage({ mode, firstName }: { mode: ShellMode; firstName: string }) {
  const { me } = useSession();
  const summary = useQuery({
    queryKey: queryKeys.dashboard.summary(me.id),
    queryFn: authApi.summary,
    staleTime: 30_000,
  });

  return (
    <div className="grid content-start gap-4">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-green-700">{mode === 'RUNNER' ? 'Runner' : 'Requester'}</p>
          <h1 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight text-ink sm:text-[32px]">Good day, {firstName}</h1>
          <p className="mt-1 text-sm text-muted">
            {mode === 'RUNNER' ? 'Your active work and new nearby errands, all in one place.' : 'Keep your errands moving and take care of anything that needs your attention.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {mode === 'RUNNER' ? (
            <>
              <Button variant="ghost" asChild><Link href="/offers">My offers</Link></Button>
              <Button asChild><Link href="/marketplace">Find errands</Link></Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild><Link href="/errands">My errands</Link></Button>
              <Button asChild><Link href="/errands/new">Post an errand</Link></Button>
            </>
          )}
        </div>
      </header>

      {summary.isLoading ? (
        <section aria-label="Dashboard summary" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-28 rounded-[var(--r-lg)]" />)}
        </section>
      ) : summary.error ? (
        <LoadError error={summary.error} onRetry={() => void summary.refetch()} />
      ) : summary.data ? (
        mode === 'RUNNER'
          ? <RunnerDashboard summary={summary.data} />
          : <RequesterDashboard summary={summary.data} />
      ) : null}

      <ModeNudge mode={mode} />
    </div>
  );
}

function RequesterDashboard({ summary }: { summary: Summary }) {
  const { me } = useSession();
  const openErrands = useQuery({
    queryKey: [...queryKeys.errands.list({ tab: 'OPEN', sort: 'NEEDS_ATTENTION' }), me.id],
    queryFn: () => api<ErrandSummary[]>('/errands/mine', { query: { tab: 'OPEN', sort: 'NEEDS_ATTENTION', limit: 5 } }),
    staleTime: 30_000,
  });
  const activeErrands = useQuery({
    queryKey: [...queryKeys.errands.list({ tab: 'ACTIVE' }), me.id],
    queryFn: () => api<ErrandSummary[]>('/errands/mine', { query: { tab: 'ACTIVE', limit: 5 } }),
    staleTime: 30_000,
  });
  const requester = summary.asRequester;
  const activity = summary.recentActivity.filter((item) => item.role === 'REQUESTER').slice(0, 4);

  return (
    <>
      <section aria-label="Requester overview" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat icon={Package} value={requester.openErrands + requester.activeErrands} label="Active errands" href="/errands?tab=OPEN" badge={`${requester.errandsThisMonth} this month`} />
        <Stat icon={Tag} value={requester.offersToReview} label="Offers waiting for you" href="/errands?tab=OPEN&sort=NEEDS_ATTENTION" tone="amber" />
        <Stat icon={Truck} value={requester.awaitingRunnerAcceptance + requester.deliveriesToConfirm} label="Runners / deliveries needing action" href="/errands?tab=ACTIVE" tone="blue" />
        <Stat icon={Check} value={requester.completedThisMonth} label="Completed this month" href="/errands?tab=PAST" tone="violet" badge={requester.successRate === null ? undefined : `${Math.round(requester.successRate * 100)}% success`} />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
        <div className="grid content-start gap-4">
          <Card variant="tint">
            <CardHeader>
              <div><CardTitle>Needs your attention</CardTitle><CardDescription>Shortcuts to the next step for your errands.</CardDescription></div>
            </CardHeader>
            <div className="divide-y divide-line">
              {requester.offersToReview > 0 && (
                <Link href="/errands?tab=OPEN&sort=NEEDS_ATTENTION" className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-white/70">
                  <IconChip tone="amber"><Tag aria-hidden="true" className="size-[18px]" /></IconChip>
                  <span className="min-w-0 flex-1"><strong className="block text-[13px] text-ink">{requester.offersToReview} offer{requester.offersToReview === 1 ? '' : 's'} waiting for you</strong><span className="mt-0.5 block text-xs text-muted">Review the runner and their offer.</span></span>
                  <span className="hidden shrink-0 rounded-full bg-ink px-3 py-2 text-[11px] font-bold text-white sm:inline-flex">Review</span>
                </Link>
              )}
              {requester.awaitingRunnerAcceptance > 0 && (
                <Link href="/errands?tab=ACTIVE" className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-white/70">
                  <IconChip tone="blue"><Clock3 aria-hidden="true" className="size-[18px]" /></IconChip>
                  <span className="min-w-0 flex-1"><strong className="block text-[13px] text-ink">{requester.awaitingRunnerAcceptance} runner{requester.awaitingRunnerAcceptance === 1 ? '' : 's'} to confirm</strong><span className="mt-0.5 block text-xs text-muted">A selected runner still needs to accept.</span></span>
                  <span className="hidden shrink-0 rounded-full bg-ink px-3 py-2 text-[11px] font-bold text-white sm:inline-flex">View</span>
                </Link>
              )}
              {requester.deliveriesToConfirm > 0 && (
                <Link href="/errands?tab=ACTIVE" className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-white/70">
                  <IconChip><CircleCheck aria-hidden="true" className="size-[18px]" /></IconChip>
                  <span className="min-w-0 flex-1"><strong className="block text-[13px] text-ink">{requester.deliveriesToConfirm} deliver{requester.deliveriesToConfirm === 1 ? 'y' : 'ies'} to confirm</strong><span className="mt-0.5 block text-xs text-muted">Confirm receipt to complete the errand.</span></span>
                  <span className="hidden shrink-0 rounded-full bg-ink px-3 py-2 text-[11px] font-bold text-white sm:inline-flex">Confirm</span>
                </Link>
              )}
              {requester.changeRequestsToAnswer > 0 && (
                <Link href="/errands?tab=ACTIVE" className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-white/70">
                  <IconChip tone="blue"><Repeat2 aria-hidden="true" className="size-[18px]" /></IconChip>
                  <span className="min-w-0 flex-1"><strong className="block text-[13px] text-ink">{requester.changeRequestsToAnswer} change request{requester.changeRequestsToAnswer === 1 ? '' : 's'} to answer</strong><span className="mt-0.5 block text-xs text-muted">Review the requested errand changes.</span></span>
                  <span className="hidden shrink-0 rounded-full bg-ink px-3 py-2 text-[11px] font-bold text-white sm:inline-flex">Answer</span>
                </Link>
              )}
              {requester.offersToReview + requester.awaitingRunnerAcceptance + requester.deliveriesToConfirm + requester.changeRequestsToAnswer === 0 && (
                <div className="px-2 py-5 text-center">
                  <p className="text-sm font-semibold text-ink">You’re all caught up.</p>
                  <p className="mt-1 text-xs text-muted">New offers and errand updates will appear here.</p>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div><CardTitle>My errands</CardTitle><CardDescription>Your open errands with the most recent activity.</CardDescription></div>
              <Link className="text-xs font-bold text-green-800 hover:underline" href="/errands">View all</Link>
            </CardHeader>
            {openErrands.isLoading ? <Skeleton className="h-36 rounded-xl" /> : openErrands.error ? (
              <LoadError error={openErrands.error} onRetry={() => void openErrands.refetch()} />
            ) : openErrands.data?.length ? (
              <div className="divide-y divide-line">
                {openErrands.data.slice(0, 4).map((errand) => (
                  <Link key={errand.id} href={`/errands/${errand.id}`} className="flex flex-wrap items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-panel/80 first:pt-1 last:pb-1">
                    <IconChip><Package aria-hidden="true" className="size-[18px]" /></IconChip>
                    <span className="min-w-0 flex-1"><strong className="block truncate text-[13px] text-ink">{errand.title}</strong><small className="mt-0.5 block text-xs text-muted">{errand.pickupArea ?? 'Area not set'}{errand.destinationArea ? ` → ${errand.destinationArea}` : ''}</small></span>
                    <span className="ml-12 flex shrink-0 items-center gap-2 sm:ml-0"><span className="rounded-full bg-amber-bg px-2.5 py-1 text-[10px] font-bold text-amber">{errand.offerCount} offer{errand.offerCount === 1 ? '' : 's'}</span><span className="text-[13px] font-extrabold text-ink">{money(errand.suggestedBudgetMinor)}</span></span>
                  </Link>
                ))}
              </div>
            ) : (
              <SectionEmpty href="/errands/new" action="Post an errand">No open errands yet. Post one to get offers from nearby runners.</SectionEmpty>
            )}
          </Card>
        </div>

        <div className="grid content-start gap-4">
          <Card variant="dark" className="relative overflow-hidden">
            <CardHeader>
              <div><CardTitle>Success rate</CardTitle><CardDescription className="text-white/70">Errands completed without a dispute</CardDescription></div>
              <Link href="/profile" aria-label="Open profile" className="grid size-9 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"><ArrowUpRight aria-hidden="true" className="size-4" /></Link>
            </CardHeader>
            <Gauge value={requester.successRate === null ? null : requester.successRate * 100} label={requester.successRate === null ? 'Complete an errand to establish your rate' : 'completed without a dispute'} dark />
            <div className="mt-2 grid grid-cols-2 gap-4 border-t border-white/15 pt-4">
              <div><span className="block text-[11px] text-white/65">Completed this month</span><strong className="mt-1 block text-xl">{requester.completedThisMonth}</strong></div>
              <div><span className="block text-[11px] text-white/65">Open errands</span><strong className="mt-1 block text-xl">{requester.openErrands}</strong></div>
            </div>
          </Card>
          <Card>
            <CardHeader><div><CardTitle>Recent activity</CardTitle><CardDescription>Latest status changes.</CardDescription></div><Link className="text-xs font-bold text-green-800 hover:underline" href="/notifications">View all</Link></CardHeader>
            {activity.length ? (
              <ol className="grid">
                {activity.map((item, index) => (
                  <li key={`${item.errandId}-${item.at}`} className="relative flex gap-3 pb-4 last:pb-0">
                    <span aria-hidden="true" className="relative z-10 mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-tint-2 text-green-900"><Check className="size-3.5" /></span>
                    {index < activity.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-[13px] top-7 w-px bg-line" />}
                    <Link href={`/errands/${item.errandId}`} className="min-w-0 pt-0.5">
                      <strong className="block text-[12px] text-ink">{item.status.replaceAll('_', ' ')} · {item.errandTitle}</strong>
                      <span className="text-[11px] text-muted">{formatDate(item.at, 'short')}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : <p className="text-sm text-muted">Your errand updates will appear here.</p>}
          </Card>
          {activeErrands.isLoading || activeErrands.error || activeErrands.data?.length ? (
            <Card>
              <CardHeader><div><CardTitle>In progress</CardTitle><CardDescription>Errands with a runner assigned.</CardDescription></div></CardHeader>
              {activeErrands.isLoading ? <Skeleton className="h-20 rounded-xl" /> : activeErrands.error ? (
                <LoadError error={activeErrands.error} onRetry={() => void activeErrands.refetch()} />
              ) : activeErrands.data?.slice(0, 3).map((errand) => (
                  <Link key={errand.id} href={`/errands/${errand.id}`} className="block border-t border-line py-3 first:border-0">
                    <strong className="block truncate text-sm text-ink">{errand.title}</strong>
                    <span className="text-xs text-muted">{errand.status.replaceAll('_', ' ')}</span>
                  </Link>
                ))}
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}

function RunnerDashboard({ summary }: { summary: Summary }) {
  const { me } = useSession();
  const queryClient = useQueryClient();
  const runner = summary.asRunner;
  const profile = useQuery({
    queryKey: ['runner', 'profile', me.id],
    queryFn: () => api<RunnerProfile>('/runner/profile'),
    retry: false,
  });
  const eligibility = useQuery({
    queryKey: ['runner', 'eligibility', me.id],
    queryFn: () => api<RunnerEligibility>('/runner/eligibility'),
    retry: false,
  });
  const assignments = useQuery({
    queryKey: [...queryKeys.assignments.list({ status: 'ACTIVE' }), me.id],
    queryFn: () => api<Assignment[]>('/runner/assignments', { query: { status: 'ACTIVE', limit: 5 } }),
    staleTime: 30_000,
  });
  const pendingAssignments = useQuery({
    queryKey: [...queryKeys.assignments.list({ status: 'PENDING_ACCEPTANCE' }), me.id],
    queryFn: () => api<Assignment[]>('/runner/assignments', { query: { status: 'PENDING_ACCEPTANCE', limit: 3 } }),
    staleTime: 30_000,
  });
  const feed = useQuery({
    queryKey: [...queryKeys.marketplace.feed({ sort: 'recommended', limit: 5 }), me.id],
    queryFn: () => api<FeedItem[]>('/marketplace/errands', { query: { sort: 'recommended', limit: 5 } }),
    enabled: eligibility.data?.canBrowseFeed === true,
    staleTime: 30_000,
  });
  const offerLimit = useQuery({
    queryKey: [...queryKeys.runner.offerLimit(), me.id],
    queryFn: () => api<OfferLimit>('/runner/offer-limit'),
  });
  const performance = useQuery({
    queryKey: [...queryKeys.runner.performance(), me.id],
    queryFn: () => api<Performance>('/runner/performance'),
    retry: false,
  });
  const availability = useMutation({
    mutationFn: (value: 'AVAILABLE' | 'UNAVAILABLE') =>
      api<RunnerProfile>('/runner/availability', { method: 'PUT', body: { availability: value } }),
    onSuccess: async (updated) => {
      queryClient.setQueryData(['runner', 'profile', me.id], updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['runner', 'eligibility', me.id] }),
        queryClient.invalidateQueries({ queryKey: [...queryKeys.marketplace.feed({ sort: 'recommended', limit: 5 }), me.id] }),
      ]);
    },
  });
  const availabilityError = availability.error;

  const reasons: Record<string, { message: string; href: string; action: string }> = {
    PHONE_NOT_VERIFIED: { message: 'Verify your phone number before offering.', href: '/profile', action: 'Review profile' },
    NOT_VERIFIED: { message: 'Complete identity verification before offering.', href: '/verification', action: 'Verify identity' },
    VERIFICATION_PENDING: { message: 'Your identity check is being reviewed.', href: '/verification', action: 'View verification' },
    NO_RUNNER_PROFILE: { message: 'Your runner profile and operating-area setup are not available here yet. Contact support for help getting set up.', href: '/help', action: 'Get help' },
    UNAVAILABLE: { message: 'You are offline. Switch availability on when you are ready.', href: '/dashboard', action: 'Availability settings' },
    RESTRICTED: { message: 'Your account has a restriction that prevents offers.', href: '/account/standing', action: 'View account standing' },
    ACCOUNT_NOT_ACTIVE: { message: 'Your account is not active for runner tasks.', href: '/account/standing', action: 'View account standing' },
  };

  return (
    <>
      <section aria-label="Runner overview" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat icon={Truck} value={runner.activeAssignments} label="Active tasks" href="/assignments?status=ACTIVE" />
        <Stat icon={Tag} value={runner.offersAwaitingYou} label="Offers awaiting your reply" href="/offers" tone="amber" />
        <Stat icon={Zap} value={offerLimit.data?.remaining ?? '—'} label="Free offers left today" href="/offers" tone="blue" badge={offerLimit.data ? `${offerLimit.data.limit} daily` : undefined} />
        <Stat icon={Star} value={performance.data?.rating.average ?? '—'} label={`Rating · ${performance.data?.rating.count ?? 0} reviews`} href="/profile" tone="violet" />
      </section>

      {pendingAssignments.isLoading ? <Skeleton className="h-20 rounded-[var(--r-lg)]" /> : pendingAssignments.error ? (
        <LoadError error={pendingAssignments.error} onRetry={() => void pendingAssignments.refetch()} />
      ) : pendingAssignments.data?.[0] ? (
        <Alert variant="warn" className="flex flex-wrap items-center gap-3 !p-4 sm:!px-5">
          <Clock3 aria-hidden="true" className="size-5 shrink-0 text-amber" />
          <span className="min-w-0 flex-1 text-[13px]"><strong>You were selected for “{pendingAssignments.data[0].errandTitle}”.</strong> Respond before the requester’s deadline.</span>
          <Link href={`/assignments/${pendingAssignments.data[0].id}`} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full bg-ink px-4 text-xs font-bold text-white hover:bg-[#0f1822]">Respond <ChevronRight aria-hidden="true" className="size-3.5" /></Link>
        </Alert>
      ) : null}

      {!eligibility.isLoading && eligibility.data && (!eligibility.data.canBrowseFeed || !eligibility.data.canOffer) && (
        <Alert variant="warn">
          <div className="grid gap-2">
            <strong>Before you can take on more errands</strong>
            {eligibility.data.reasons.filter((reason) => reason !== 'UNAVAILABLE').map((reason) => {
              const info = reasons[reason];
              return info ? <p key={reason} className="text-sm">{info.message} <Link href={info.href} className="font-bold underline">{info.action}</Link></p> : null;
            })}
          </div>
        </Alert>
      )}
      {eligibility.error && <LoadError error={eligibility.error} onRetry={() => void eligibility.refetch()} />}

      {profile.data && (
        <Card id="availability" variant="tint" className="flex flex-wrap items-center justify-between gap-4 !p-4 sm:!px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`grid size-10 shrink-0 place-items-center rounded-full ${profile.data.availability === 'AVAILABLE' ? 'bg-ok-bg text-ok' : 'bg-panel text-muted'}`}><span className={`size-2.5 rounded-full ${profile.data.availability === 'AVAILABLE' ? 'bg-ok' : 'bg-faint'}`} /></span>
            <div>
              <strong className="block text-[13px] text-ink">{profile.data.availability === 'AVAILABLE' ? 'You are online' : 'You are offline'}</strong>
              <span className="text-xs text-muted">{profile.data.availability === 'AVAILABLE' ? 'Nearby errand offers are on.' : 'New offers are paused.'}</span>
            </div>
          </div>
          <Button
            type="button"
            variant={profile.data.availability === 'AVAILABLE' ? 'ghost' : 'primary'}
            disabled={availability.isPending}
            onClick={() => availability.mutate(profile.data!.availability === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE')}
          >
            {availability.isPending ? 'Updating…' : profile.data.availability === 'AVAILABLE' ? 'Go offline' : 'Go online'}
          </Button>
        </Card>
      )}
      {profile.error && !eligibility.data?.reasons.includes('NO_RUNNER_PROFILE') && (
        <LoadError error={profile.error} onRetry={() => void profile.refetch()} />
      )}
      {availabilityError && <LoadError error={availabilityError} onRetry={() => availability.variables && availability.mutate(availability.variables)} />}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
        <div className="grid content-start gap-4">
          <Card>
            <CardHeader><div><CardTitle>Your active tasks</CardTitle><CardDescription>Keep the requester updated as each task progresses.</CardDescription></div><Link href="/assignments?status=ACTIVE" className="text-xs font-bold text-green-800 hover:underline">Open all</Link></CardHeader>
            {assignments.isLoading ? <Skeleton className="h-32 rounded-xl" /> : assignments.error ? (
              <LoadError error={assignments.error} onRetry={() => void assignments.refetch()} />
            ) : assignments.data?.length ? (
              <div className="divide-y divide-line">
                {assignments.data.slice(0, 4).map((assignment) => (
                  <Link key={assignment.id} href={`/assignments/${assignment.id}`} className="mb-3 block rounded-[var(--r)] border border-line p-4 transition-colors last:mb-0 hover:border-lime-600 hover:bg-panel/50">
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full bg-blue-bg px-2.5 py-1 text-[10px] font-bold text-blue">{assignment.errandStatus.replaceAll('_', ' ')}</span>
                      <span className="text-[13px] font-extrabold text-ink">{money(assignment.agreedAmountMinor)}</span>
                    </span>
                    <strong className="mt-3 block text-[13px] leading-snug text-ink">{assignment.errandTitle}</strong>
                    <span className="mt-2 flex items-center gap-2 text-xs text-muted"><MapPin aria-hidden="true" className="size-3.5 shrink-0" /><span className="truncate">{assignment.pickupArea ?? 'Pickup area not shared'}{assignment.destinationArea ? ` → ${assignment.destinationArea}` : ''}</span></span>
                    <span className="mt-4 block"><TaskProgress status={assignment.errandStatus} /></span>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-green-800">View task <ChevronRight aria-hidden="true" className="size-3.5" /></span>
                  </Link>
                ))}
              </div>
            ) : <SectionEmpty href="/marketplace" action="Find errands">No active tasks right now. Browse nearby errands to find your next job.</SectionEmpty>}
          </Card>

          <Card>
            <CardHeader><div><CardTitle>Errands near you</CardTitle><CardDescription>Open errands in your operating area.</CardDescription></div><Link href="/marketplace" className="text-xs font-bold text-green-800 hover:underline">See all</Link></CardHeader>
            {eligibility.isLoading || feed.isLoading ? <Skeleton className="h-36 rounded-xl" /> : eligibility.error ? (
              <LoadError error={eligibility.error} onRetry={() => void eligibility.refetch()} />
            ) : !eligibility.data?.canBrowseFeed ? (
              <SectionEmpty href="/verification" action="Check eligibility">Complete your runner setup to browse the marketplace.</SectionEmpty>
            ) : feed.error ? <LoadError error={feed.error} onRetry={() => void feed.refetch()} /> : feed.data?.length ? (
              <div className="divide-y divide-line">
                {feed.data.slice(0, 5).map((errand) => (
                  <Link key={errand.id} href={`/marketplace/${errand.id}`} className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-panel/80 first:pt-1 last:pb-1">
                    <IconChip tone={errand.boosted ? 'violet' : 'green'}><Package aria-hidden="true" className="size-[18px]" /></IconChip>
                    <span className="min-w-0 flex-1"><strong className="block truncate text-[13px] text-ink">{errand.title}</strong><small className="mt-0.5 block text-xs text-muted">{errand.pickup?.area ?? 'Nearby'}{errand.distance ? ` · ${errand.distance.label}` : ''}</small></span>
                    <span className="shrink-0 text-right"><strong className="block text-[13px] font-extrabold text-ink">{money(errand.suggestedBudgetMinor)}</strong><small className="text-[10px] text-muted">{errand.offerCount} offers</small></span>
                  </Link>
                ))}
              </div>
            ) : <SectionEmpty href="/marketplace" action="Refresh marketplace">No new errands nearby right now.</SectionEmpty>}
          </Card>
        </div>

        <div className="grid content-start gap-4">
          <Card variant="tint">
            <CardHeader><div><CardTitle>Offer allowance</CardTitle><CardDescription>Resets at midnight, Lagos time.</CardDescription></div><span className={`rounded-full px-3 py-1 text-[10px] font-extrabold ${offerLimit.data?.isPro ? 'bg-ink text-white' : 'bg-white text-ink'}`}>{offerLimit.data?.isPro ? 'Runner Pro' : 'Free plan'}</span></CardHeader>
            {offerLimit.isLoading ? <Skeleton className="h-20 rounded-xl" /> : offerLimit.error ? <LoadError error={offerLimit.error} onRetry={() => void offerLimit.refetch()} /> : offerLimit.data ? (
              <>
                <Gauge value={offerLimit.data.limit > 0 ? offerLimit.data.used / offerLimit.data.limit * 100 : 0} label={`${offerLimit.data.used} of ${offerLimit.data.limit} offers used today`} />
                <p className="mt-2 text-center text-[13px] font-bold text-ink">{offerLimit.data.remaining} offer{offerLimit.data.remaining === 1 ? '' : 's'} left today</p>
                {!offerLimit.data.isPro && <Link href="/pro" className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-4 text-xs font-bold text-white hover:bg-[#0f1822]"><Zap aria-hidden="true" className="size-4 text-lime" />Explore Runner Pro</Link>}
              </>
            ) : null}
          </Card>

          <Card>
            <CardHeader><div><CardTitle>Offers this week</CardTitle><CardDescription>Your recent marketplace activity.</CardDescription></div><IconChip tone="blue"><Tag aria-hidden="true" className="size-[18px]" /></IconChip></CardHeader>
            <div className="flex items-end justify-between gap-3 rounded-xl bg-panel p-4">
              <div><strong className="block text-[32px] font-extrabold leading-none tracking-tight text-ink">{runner.offersThisWeek}</strong><span className="mt-2 block text-xs font-semibold text-muted">Offers sent</span></div>
              <div className="text-right"><strong className="block text-xl font-extrabold text-ink">{runner.completedLast30Days}</strong><span className="text-[11px] text-muted">Completed · 30 days</span></div>
            </div>
          </Card>

          <Card>
            <CardHeader><div><CardTitle>Reputation</CardTitle><CardDescription>Build trust with every completed errand.</CardDescription></div><Link href="/profile" className="text-xs font-bold text-green-800 hover:underline">Profile</Link></CardHeader>
            {performance.isLoading ? <Skeleton className="h-20 rounded-xl" /> : performance.error ? (
              <LoadError error={performance.error} onRetry={() => void performance.refetch()} />
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <div className="relative grid size-16 shrink-0 place-items-center rounded-full text-sm font-extrabold text-ink" style={{ background: `conic-gradient(#668a00 ${(performance.data?.rating.average ?? 0) / 5 * 100}%, #e7ebe3 0)` }}>
                    <span className="grid size-[50px] place-items-center rounded-full bg-white">{performance.data?.rating.average ?? '—'}</span>
                  </div>
                  <div><strong className="text-sm text-ink">Runner rating</strong><p className="text-xs text-muted">{performance.data?.rating.count ?? 0} reviews · {performance.data?.completedErrands ?? runner.completedLast30Days} errands completed</p></div>
                </div>
                {!!performance.data?.badges.length && <div className="mt-4 flex flex-wrap gap-2">{performance.data.badges.map((badge) => <span key={badge} className="rounded-full bg-tint px-3 py-1 text-[11px] font-bold text-green-900">{badge.replaceAll('_', ' ')}</span>)}</div>}
              </>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
