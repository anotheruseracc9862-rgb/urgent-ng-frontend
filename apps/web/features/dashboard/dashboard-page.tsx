'use client';

import { ProBadge, isProBadge, useIsPro } from '@/components/runner/pro-badge';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleCheck,
  MessageSquare,
  Plus,
  Compass,
  Clock3,
  ChevronRight,
  Package,
  Repeat2,
  Star,
  Tag,
  Truck,
  Zap,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { Alert, Button, Card, CardDescription, CardHeader, CardTitle, Skeleton } from '@urgent/ui';
import { formatRelativeTime } from '@urgent/utils';
import { useSession } from '@/lib/auth/client';
import { api } from '@/lib/api/client';
import type { ShellMode } from '@/components/shell/nav-items';
import { PageHead } from '@/components/shell/page-head';
import { Stat } from '@/components/shell/stat-card';
import { formatMinutes, minutesUntil } from '@/lib/time-left';
import { QuickPostDialog } from './quick-post-dialog';
import { useNearbyErrands } from '@/features/marketplace/use-nearby-errands';
import { assignmentQueries } from '@/features/assignments/queries';
import { billingQueries } from '@/features/billing/queries';
import { errandQueries } from '@/features/errands/queries';
import { runnerQueries } from '@/features/runner/queries';
import { useApiMutation } from '@/lib/query/mutations';
import { dashboardQueries } from './queries';

type Summary = components['schemas']['MeSummaryDto'];
type ErrandSummary = components['schemas']['ErrandSummaryDto'];
type RunnerProfile = components['schemas']['RunnerProfileDto'];
type MetricTone = 'green' | 'amber' | 'blue' | 'violet' | 'red';

const money = (minor: number | null) =>
  minor === null ? 'No budget' : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(minor / 100);

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert variant="danger" role="alert">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>We could not load this dashboard section.</span>
        <Button type="button" variant="ghost" size="sm" onClick={onRetry}>Retry</Button>
      </div>
    </Alert>
  );
}

function IconChip({ children, tone = 'green' }: { children: React.ReactNode; tone?: MetricTone }) {
  const toneClass = {
    green: 'bg-tint-2 text-green-900',
    amber: 'bg-amber-bg text-amber',
    blue: 'bg-blue-bg text-blue',
    violet: 'bg-violet-bg text-violet',
    red: 'bg-red-bg text-red',
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

const ROW = 'flex items-center gap-3.5 rounded-[var(--r-sm)] border-t border-line-2 px-1 py-3.5 first:border-0 transition-colors hover:bg-panel';
const ROW_BUTTON = 'inline-flex min-h-9 shrink-0 items-center justify-center rounded-full bg-ink px-3.5 text-[12.5px] font-bold text-white transition-colors group-hover:bg-[#0f1822]';

const ERRAND_STATUS_LABEL: Record<string, { label: string; tone: 'amber' | 'blue' | 'green' | 'plain' | 'red' }> = {
  OPEN: { label: 'Open', tone: 'amber' },
  RUNNER_SELECTED: { label: 'Runner selected', tone: 'blue' },
  ACCEPTED: { label: 'Accepted', tone: 'blue' },
  IN_PROGRESS: { label: 'On the way', tone: 'blue' },
  PICKED_UP: { label: 'Picked up', tone: 'blue' },
  DELIVERED: { label: 'Delivered · confirm', tone: 'green' },
  COMPLETED: { label: 'Completed', tone: 'plain' },
  CANCELLED: { label: 'Cancelled', tone: 'red' },
  EXPIRED: { label: 'Expired', tone: 'plain' },
  DISPUTED: { label: 'Disputed', tone: 'red' },
};

const BADGE_TONE = {
  amber: 'bg-amber-bg text-amber',
  blue: 'bg-blue-bg text-blue',
  green: 'bg-ok-bg text-ok',
  red: 'bg-red-bg text-red',
  plain: 'bg-panel text-ink-2',
} as const;

function Badge({ tone, children, pulse = false }: { tone: keyof typeof BADGE_TONE; children: React.ReactNode; pulse?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-bold ${BADGE_TONE[tone]}`}>
      {pulse ? <span aria-hidden="true" className="size-[7px] animate-pulse rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

function RouteBox({ from, to }: { from: string; to?: string | null }) {
  return (
    <div className="grid gap-2 rounded-[var(--r-sm)] bg-panel px-3.5 py-3 text-[12.5px]">
      <div className="flex items-start gap-2.5"><i aria-hidden="true" className="mt-[5px] size-2.5 shrink-0 rounded-full bg-lime-600" /><span>{from}</span></div>
      {to ? <div className="flex items-start gap-2.5"><i aria-hidden="true" className="mt-[5px] size-2.5 shrink-0 rounded-full bg-ink" /><span>{to}</span></div> : null}
    </div>
  );
}

/** Demo `.bars`: columns scaled to the largest value; an optional inner bar shows a subset. */
function Bars({ items, label }: {
  label: string;
  items: Array<{ key: string; caption: string; value: number; detail: string; inner?: number; highlight?: boolean }>;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <div role="img" aria-label={`${label}. ${items.map((item) => `${item.caption}: ${item.detail}`).join('; ')}`} className="grid h-[170px] auto-cols-fr grid-flow-col items-end gap-3 pt-2.5">
      {items.map((item) => {
        const height = item.value === 0 ? 4 : Math.max(8, Math.round((item.value / max) * 100));
        const inner = item.inner && item.value > 0 ? Math.round((Math.min(item.inner, item.value) / item.value) * 100) : 0;
        return (
          <div key={item.key} title={item.detail} className="flex h-full flex-col items-center justify-end gap-2 text-[11.5px] font-semibold text-muted">
            <span className="text-[11px] font-bold tabular-nums text-ink-2">{item.value}</span>
            <i
              aria-hidden="true"
              className={`relative block w-full max-w-[54px] overflow-hidden rounded-[14px] transition-transform hover:-translate-y-0.5 ${item.value === 0 ? 'bg-line' : item.highlight || item.inner !== undefined ? 'bg-gradient-to-b from-green to-green-900' : 'bg-[repeating-linear-gradient(135deg,#e6e9e1_0_5px,#f1f3ee_5px_10px)]'}`}
              style={{ height: `${height}%` }}
            >
              {inner > 0 ? <span className="absolute inset-x-0 bottom-0 bg-lime" style={{ height: `${inner}%` }} /> : null}
            </i>
            <span className={item.highlight ? 'text-ink' : undefined}>{item.caption}</span>
          </div>
        );
      })}
    </div>
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

/** The sentence under the greeting, built from what actually needs the person. */
function headline(mode: ShellMode, summary: Summary | undefined): string {
  if (!summary) return mode === 'RUNNER' ? 'Your active work and new nearby errands, all in one place.' : 'Keep your errands moving and take care of anything that needs your attention.';
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  if (mode === 'RUNNER') {
    const r = summary.asRunner;
    const parts = [
      r.activeAssignments > 0 ? `${plural(r.activeAssignments, 'active task', 'active tasks')}` : '',
      r.selectedAwaitingYou > 0 ? `${plural(r.selectedAwaitingYou, 'request', 'requests')} waiting for your answer` : '',
    ].filter(Boolean);
    return parts.length ? `You have ${parts.join(' and ')}.` : 'No active tasks right now. Browse nearby errands to find your next job.';
  }
  const q = summary.asRequester;
  const parts = [
    q.offersToReview > 0 ? `${plural(q.offersToReview, 'offer', 'offers')} waiting` : '',
    q.deliveriesToConfirm > 0 ? `${plural(q.deliveriesToConfirm, 'delivery', 'deliveries')} to confirm` : '',
  ].filter(Boolean);
  return parts.length ? `You have ${parts.join(' and ')}.` : 'You are all caught up. New offers and updates will show here.';
}

export function DashboardPage({ mode, firstName, greeting = 'Hello' }: { mode: ShellMode; firstName: string; greeting?: string }) {
  const { me } = useSession();
  const summary = useQuery(dashboardQueries.summary(me.id));
  const isPro = useIsPro(mode === 'RUNNER');

  return (
    <div className="grid content-start gap-4">
      <PageHead
        eyebrow={mode === 'RUNNER' ? 'Runner' : 'Requester'}
        title={<span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">{`${greeting}, ${firstName}`}{isPro ? <ProBadge className="py-1 text-xs" /> : null}</span>}
        description={headline(mode, summary.data)}
        actions={mode === 'RUNNER' ? (
          <>
            <Button variant="ghost" asChild><Link href="/offers"><Tag aria-hidden="true" className="size-4" />My offers</Link></Button>
            <Button asChild><Link href="/marketplace"><Compass aria-hidden="true" className="size-4" />Find errands</Link></Button>
          </>
        ) : (
          <>
            <QuickPostDialog />
            <Button asChild><Link href="/errands/new"><Plus aria-hidden="true" className="size-4" />Post an errand</Link></Button>
          </>
        )}
      />

      {summary.error && !summary.data ? <LoadError onRetry={() => void summary.refetch()} /> : null}

      {/* The stat cards, headings and layout are always there; numbers show a dash until they arrive. */}
      {mode === 'RUNNER'
        ? <RunnerDashboard summary={summary.data} />
        : <RequesterDashboard summary={summary.data} />}

    </div>
  );
}

const EMPTY_REQUESTER: Summary['asRequester'] = {
  errandsThisMonth: 0, completedThisMonth: 0, openErrands: 0, activeErrands: 0, successRate: null, errandsWithOffers: 0,
  offersToReview: 0, awaitingRunnerAcceptance: 0, deliveriesToConfirm: 0, changeRequestsToAnswer: 0,
  errandsPerWeek: [], averageOffersPerErrand: null, medianMinutesToSelect: null,
};

const EMPTY_RUNNER: Summary['asRunner'] = {
  activeAssignments: 0, selectedAwaitingYou: 0, activeOffers: 0, offersAwaitingYou: 0, offersThisWeek: 0,
  completedLast30Days: 0, changeRequestsToAnswer: 0, offersPerDay: [],
};

/** A figure that has not arrived yet shows a dash, not a skeleton, so the card keeps its shape. */
const figure = (loading: boolean, value: number | string) => (loading ? '—' : value);

function RequesterDashboard({ summary }: { summary: Summary | undefined }) {
  const { me } = useSession();
  const openErrands = useQuery(errandQueries.open(me.id));
  const activeErrands = useQuery(errandQueries.active(me.id));
  const loading = !summary;
  const requester = summary?.asRequester ?? EMPTY_REQUESTER;
  const errands = [...(openErrands.data ?? []), ...(activeErrands.data ?? [])].slice(0, 4);
  const closingSoon = (openErrands.data ?? [])
    .map((errand) => ({ errand, minutes: minutesUntil(errand.expiresAt) }))
    .filter((item): item is { errand: ErrandSummary; minutes: number } => item.minutes !== null && item.minutes <= 120)
    .slice(0, 2);
  const activity = (summary?.recentActivity ?? []).filter((item) => item.role === 'REQUESTER').slice(0, 4);

  const nothingToDo = !loading && requester.offersToReview + requester.awaitingRunnerAcceptance + requester.deliveriesToConfirm
    + requester.changeRequestsToAnswer + closingSoon.length === 0;

  return (
    <>
      <section aria-label="Requester overview" className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
        <Stat icon={Package} value={figure(loading, requester.openErrands + requester.activeErrands)} label="Active errands" href="/errands" badge={loading ? undefined : `${requester.errandsThisMonth} this month`} />
        <Stat icon={Tag} value={figure(loading, requester.offersToReview)} label="Offers waiting for you" href="/errands?tab=OPEN&sort=NEEDS_ATTENTION" tone="amber" />
        <Stat icon={Truck} value={figure(loading, requester.activeErrands)} label="Runners on the way" href="/errands?tab=ACTIVE" tone="blue" />
        <Stat icon={Check} value={figure(loading, requester.completedThisMonth)} label="Completed this month" tone="violet" badge={loading || requester.successRate === null ? undefined : `${Math.round(requester.successRate * 100)}%`} />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
        <div className="grid content-start gap-4">
          <Card variant="tint">
            <CardHeader>
              <div><CardTitle>Needs your attention</CardTitle><CardDescription>Quick actions that keep errands moving.</CardDescription></div>
            </CardHeader>
            <div>
              {loading ? (
                <div className="grid gap-3" aria-label="Loading">
                  <Skeleton className="h-14 rounded-[var(--r-sm)]" />
                  <Skeleton className="h-14 rounded-[var(--r-sm)]" />
                </div>
              ) : null}
              {requester.offersToReview > 0 && (
                <Link href="/errands?tab=OPEN&sort=NEEDS_ATTENTION" className={`group ${ROW}`}>
                  <IconChip tone="amber"><Tag aria-hidden="true" className="size-[18px]" /></IconChip>
                  <span className="min-w-0 flex-1"><strong className="block text-sm text-ink">{requester.offersToReview} offer{requester.offersToReview === 1 ? '' : 's'} waiting for you</strong><span className="block text-[12.5px] text-muted">Review the runner and their offer.</span></span>
                  <span className={ROW_BUTTON}>Review</span>
                </Link>
              )}
              {requester.deliveriesToConfirm > 0 && (
                <Link href="/errands?tab=ACTIVE" className={`group ${ROW}`}>
                  <IconChip><CircleCheck aria-hidden="true" className="size-[18px]" /></IconChip>
                  <span className="min-w-0 flex-1"><strong className="block text-sm text-ink">{requester.deliveriesToConfirm} deliver{requester.deliveriesToConfirm === 1 ? 'y' : 'ies'} to confirm</strong><span className="block text-[12.5px] text-muted">Confirm receipt or it completes automatically.</span></span>
                  <span className={ROW_BUTTON}>Confirm</span>
                </Link>
              )}
              {requester.changeRequestsToAnswer > 0 && (
                <Link href="/errands?tab=ACTIVE" className={`group ${ROW}`}>
                  <IconChip tone="blue"><Repeat2 aria-hidden="true" className="size-[18px]" /></IconChip>
                  <span className="min-w-0 flex-1"><strong className="block text-sm text-ink">{requester.changeRequestsToAnswer} change request{requester.changeRequestsToAnswer === 1 ? '' : 's'} to answer</strong><span className="block text-[12.5px] text-muted">A runner asked to change the amount, place or time.</span></span>
                  <span className={ROW_BUTTON}>Answer</span>
                </Link>
              )}
              {requester.awaitingRunnerAcceptance > 0 && (
                <Link href="/errands?tab=ACTIVE" className={`group ${ROW}`}>
                  <IconChip tone="blue"><Clock3 aria-hidden="true" className="size-[18px]" /></IconChip>
                  <span className="min-w-0 flex-1"><strong className="block text-sm text-ink">{requester.awaitingRunnerAcceptance} runner{requester.awaitingRunnerAcceptance === 1 ? '' : 's'} to confirm</strong><span className="block text-[12.5px] text-muted">A selected runner still needs to accept.</span></span>
                  <span className={ROW_BUTTON}>View</span>
                </Link>
              )}
              {closingSoon.map(({ errand, minutes }) => (
                <Link key={errand.id} href={`/errands/${errand.id}`} className={`group ${ROW}`}>
                  <IconChip tone="red"><Clock3 aria-hidden="true" className="size-[18px]" /></IconChip>
                  <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-ink">“{errand.title}” closes in {formatMinutes(minutes)}</strong><span className="block text-[12.5px] text-muted">{errand.offerCount} offer{errand.offerCount === 1 ? '' : 's'} so far. Extend it once, or boost it.</span></span>
                  <span className={ROW_BUTTON}>Extend</span>
                </Link>
              ))}
              {nothingToDo && (
                <div className="px-2 py-5 text-center">
                  <p className="text-sm font-semibold text-ink">You’re all caught up.</p>
                  <p className="mt-1 text-xs text-muted">New offers and errand updates will appear here.</p>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div><CardTitle>My errands</CardTitle><CardDescription>Your latest four. See everything on the errands page.</CardDescription></div>
              <Link className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-surface px-3.5 text-[12.5px] font-bold text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-panel max-lg:shrink-0 max-lg:whitespace-nowrap" href="/errands">View all <ChevronRight aria-hidden="true" className="size-3.5" /></Link>
            </CardHeader>
            {openErrands.isPending || activeErrands.isPending ? <Skeleton className="h-36 rounded-xl" /> : openErrands.error ? (
              <LoadError onRetry={() => void openErrands.refetch()} />
            ) : errands.length ? (
              <div>
                {errands.map((errand) => {
                  const status = ERRAND_STATUS_LABEL[errand.status] ?? { label: errand.status.replaceAll('_', ' '), tone: 'plain' as const };
                  const open = errand.status === 'OPEN';
                  return (
                    <Link key={errand.id} href={`/errands/${errand.id}`} className={ROW}>
                      <IconChip tone={open ? 'amber' : 'blue'}>
                        {open ? <Tag aria-hidden="true" className="size-[18px]" /> : <Truck aria-hidden="true" className="size-[18px]" />}
                      </IconChip>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm text-ink">{errand.title}</strong>
                        <span className="block truncate text-[12.5px] text-muted">{errand.pickupArea ?? 'Area not set'}{errand.destinationArea ? ` → ${errand.destinationArea}` : ' · On site'}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <Badge tone={open ? 'amber' : status.tone}>{open ? `${errand.offerCount} offer${errand.offerCount === 1 ? '' : 's'}` : status.label}</Badge>
                        <span className="mt-1 block text-[11px] text-muted">{errand.suggestedBudgetMinor === null ? 'No budget' : `Budget ${money(errand.suggestedBudgetMinor)}`}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <SectionEmpty href="/errands/new" action="Post an errand">No errands yet. Post one to get offers from nearby runners.</SectionEmpty>
            )}
          </Card>
        </div>

        <div className="grid content-start gap-4">
          <Card variant="dark">
            <CardHeader>
              <div><CardTitle>Success rate</CardTitle><CardDescription className="text-white/70">Errands completed without a dispute</CardDescription></div>
              <Link href="/profile" aria-label="Open profile" className="grid size-[42px] place-items-center rounded-full bg-[#26323f] text-white transition-colors hover:bg-[#344154]"><ArrowUpRight aria-hidden="true" className="size-[18px]" /></Link>
            </CardHeader>
            <Gauge value={requester.successRate === null ? null : requester.successRate * 100} label={loading ? 'Loading…' : requester.successRate === null ? 'Complete an errand to establish your rate' : 'completed without a dispute'} dark />
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <span className="block text-xs text-[#aeb8c6]">Avg. time to select</span>
                <strong className="mt-0.5 block text-[20px]">{requester.medianMinutesToSelect === null ? '—' : formatMinutes(requester.medianMinutesToSelect)}</strong>
              </div>
              <div>
                <span className="block text-xs text-[#aeb8c6]">Avg. offers per errand</span>
                <strong className="mt-0.5 block text-[20px]">{requester.averageOffersPerErrand === null ? '—' : requester.averageOffersPerErrand}</strong>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div><CardTitle>Errands posted</CardTitle><CardDescription>Per week, last four weeks</CardDescription></div>
              {loading ? null : <span className="inline-flex rounded-full bg-tint-2 px-2.5 py-1 text-[11.5px] font-bold text-green-900">{requester.errandsThisMonth} this month</span>}
            </CardHeader>
            {loading ? <Skeleton className="h-[170px] rounded-[var(--r)]" /> : <Bars
              label="Errands posted in each of the last four weeks"
              items={requester.errandsPerWeek.map((count, index, all) => ({
                key: `w${index}`,
                caption: index === all.length - 1 ? 'This wk' : `${all.length - 1 - index} wk ago`,
                value: count,
                detail: `${count} errand${count === 1 ? '' : 's'}`,
                highlight: index === all.length - 1,
              }))}
            />}
          </Card>

          <Card>
            <CardHeader><CardTitle>Recent activity</CardTitle><Link className="text-xs font-bold text-green-700 hover:underline" href="/notifications">View all</Link></CardHeader>
            {loading ? (
              <div className="grid gap-4" aria-label="Loading activity"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
            ) : activity.length ? (
              <ol className="grid grid-cols-[minmax(0,1fr)]">
                {activity.map((item, index) => (
                  <li key={`${item.errandId}-${item.at}`} className="relative flex gap-3.5 pb-5 last:pb-0">
                    <span aria-hidden="true" className="relative z-10 grid size-7 shrink-0 place-items-center rounded-full bg-lime text-ink"><Check className="size-3.5" /></span>
                    {index < activity.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-[13px] top-7 w-0.5 bg-lime" />}
                    <Link href={`/errands/${item.errandId}`} className="min-w-0">
                      <strong className="block text-[13.5px] text-ink">{(ERRAND_STATUS_LABEL[item.status]?.label ?? item.status.replaceAll('_', ' '))}</strong>
                      <small className="block truncate text-xs text-muted max-lg:whitespace-normal max-lg:break-words">“{item.errandTitle}” · {formatRelativeTime(item.at)}</small>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : <p className="text-sm text-muted">Your errand updates will appear here.</p>}
          </Card>
        </div>
      </div>
    </>
  );
}

function RunnerDashboard({ summary }: { summary: Summary | undefined }) {
  const { me } = useSession();
  const queryClient = useQueryClient();
  const loading = !summary;
  const runner = summary?.asRunner ?? EMPTY_RUNNER;
  const profile = useQuery(runnerQueries.profile(me.id));
  const nearby = useNearbyErrands(me.id, true);
  const eligibility = nearby.eligibility;
  const assignments = useQuery(assignmentQueries.runnerTasks(me.id, 'ACTIVE', 5));
  const pendingAssignments = useQuery(assignmentQueries.runnerTasks(me.id, 'PENDING_ACCEPTANCE', 3));
  const feed = {
    isLoading: nearby.feed.isLoading,
    error: nearby.feed.error,
    data: nearby.items,
    refetch: nearby.feed.refetch,
  };
  const offerLimit = useQuery(runnerQueries.offerLimit(me.id));
  const performance = useQuery(runnerQueries.performance(me.id));
  const availability = useApiMutation({
    mutationFn: (value: 'AVAILABLE' | 'UNAVAILABLE') =>
      api<RunnerProfile>('/runner/availability', { method: 'PUT', body: { availability: value } }),
    // Going online or offline changes what the runner may browse, offer on and see counted in the rail.
    affects: ['runner'],
    onSuccess: (updated) => {
      queryClient.setQueryData(runnerQueries.profile(me.id).queryKey, updated);
    },
  });
  const availabilityError = availability.error;
  const products = useQuery(billingQueries.products());
  const proProduct = Array.isArray(products.data) ? products.data.find((product) => product.orderType === 'RUNNER_PRO') : undefined;

  const reasons: Record<string, { message: string; href: string; action: string }> = {
    RESTRICTED: { message: 'Your account has a restriction that prevents offers.', href: '/account/standing', action: 'View account standing' },
    ACCOUNT_NOT_ACTIVE: { message: 'Your account is not active for runner tasks.', href: '/account/standing', action: 'View account standing' },
  };
  const eligibilityReasons = !eligibility.isLoading && eligibility.data && (!eligibility.data.canBrowseFeed || !eligibility.data.canOffer)
    ? eligibility.data.reasons
    : [];
  const verificationRequired = eligibilityReasons.some((reason) => reason === 'NOT_VERIFIED' || reason === 'PHONE_NOT_VERIFIED');
  const verificationPending = eligibilityReasons.includes('VERIFICATION_PENDING');
  const runnerSetupRequired = eligibilityReasons.some((reason) => reason === 'NO_RUNNER_PROFILE' || reason === 'OPERATING_AREA_REQUIRED');
  const accountBlockers = eligibilityReasons.filter((reason) => reasons[reason]);

  const completionPercent = performance.data && performance.data.cancellation.sample > 0
    ? Math.max(0, Math.min(100, Math.round(100 - (performance.data.cancellation.percent ?? 0))))
    : null;
  const completedOfSample = performance.data && performance.data.cancellation.sample > 0
    ? performance.data.cancellation.sample - Math.round(performance.data.cancellation.sample * (performance.data.cancellation.percent ?? 0) / 100)
    : 0;
  const stepLabel: Record<string, { badge: string; action: string }> = {
    RUNNER_SELECTED: { badge: 'Accepted', action: 'Update progress' },
    ACCEPTED: { badge: 'Accepted', action: 'Update progress' },
    IN_PROGRESS: { badge: 'On the way to pickup', action: 'Update progress' },
    PICKED_UP: { badge: 'Picked up', action: 'Mark delivered' },
    DELIVERED: { badge: 'Delivered', action: 'View task' },
  };

  return (
    <>
      {/* The rail has this switch on desktop; phones have no rail, so it lives here too. */}
      {profile.data && (
        <Card id="availability" variant="tint" className="flex flex-wrap items-center justify-between gap-4 !p-4 lg:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className={`size-2.5 rounded-full ${profile.data.availability === 'AVAILABLE' ? 'bg-lime-600 shadow-[0_0_0_3px_rgba(147,199,0,.25)]' : 'bg-faint'}`} />
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

      {pendingAssignments.isPending ? <Skeleton className="h-16 rounded-[var(--r)]" /> : pendingAssignments.error ? (
        <LoadError onRetry={() => void pendingAssignments.refetch()} />
      ) : pendingAssignments.data?.[0] ? (
        <Link
          href={`/assignments/${pendingAssignments.data[0].id}`}
          className="group flex flex-wrap items-center gap-3 rounded-[var(--r)] bg-amber-bg px-4 py-3.5 text-[13px] text-[#7a4800]"
        >
          <Clock3 aria-hidden="true" className="size-5 shrink-0" />
          <span className="min-w-0 flex-1">
            <strong>You were selected for “{pendingAssignments.data[0].errandTitle}”.</strong>
            {minutesUntil(pendingAssignments.data[0].acceptanceDeadline) !== null
              ? ` Accept within ${formatMinutes(minutesUntil(pendingAssignments.data[0].acceptanceDeadline) ?? 0)} or it goes back to the requester.`
              : ' Respond before the requester’s deadline.'}
          </span>
          <span className={ROW_BUTTON}>Respond</span>
        </Link>
      ) : null}

      <section aria-label="Runner overview" className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
        <Stat icon={Truck} value={figure(loading, runner.activeAssignments)} label="Active tasks" href="/assignments" />
        <Stat icon={Tag} value={figure(loading, runner.offersAwaitingYou)} label="Offers awaiting a reply" href="/offers" tone="amber" />
        <Stat
          icon={Zap}
          tone="blue"
          value={offerLimit.data ? offerLimit.data.remaining : '—'}
          suffix={offerLimit.data ? `/ ${offerLimit.data.limit}` : undefined}
          label={offerLimit.data?.isPro ? 'Offers left today' : 'Free offers left today'}
          action={offerLimit.data && !offerLimit.data.isPro ? { href: '/pro', label: 'Go Pro' } : undefined}
        />
        <Stat icon={Star} value={performance.data?.rating.average ?? '—'} label={`Rating · ${performance.data?.completedErrands ?? 0} errands`} href="/ratings" tone="violet" />
      </section>

      {(verificationRequired || verificationPending || runnerSetupRequired) && (
        <section aria-labelledby="runner-setup-title" className="grid grid-cols-[minmax(0,1fr)_64px] items-center gap-4 overflow-hidden rounded-[var(--r-lg)] bg-gradient-to-br from-tint to-surface p-4 shadow-[var(--shadow)] sm:grid-cols-[minmax(0,1fr)_100px] sm:gap-6 sm:p-5">
          <div className="min-w-0">
            <h2 id="runner-setup-title" className="text-lg font-extrabold tracking-tight text-ink">
              {verificationPending && !verificationRequired ? 'Your verification is in progress' : 'Your next errand starts here'}
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
              {verificationRequired
                ? 'Complete runner verification to browse nearby errands and send offers.'
                : verificationPending
                  ? 'Your identity check is being reviewed. You can check its progress any time.'
                  : 'Choose your operating area and travel preferences to start finding nearby errands.'}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button asChild size="sm">
                <Link href={verificationRequired || verificationPending ? '/verification' : '/runner/profile'}>
                  {verificationRequired ? 'Continue verification' : verificationPending ? 'View verification' : 'Set up runner profile'}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              {runnerSetupRequired && (verificationRequired || verificationPending) && (
                <Button asChild size="sm" variant="ghost"><Link href="/runner/profile">Set up runner profile</Link></Button>
              )}
            </div>
          </div>
          <Image src="/assets/mascot.png" alt="" width={100} height={106} className="h-auto w-full" />
        </section>
      )}
      {accountBlockers.length > 0 && (
        <Alert variant="warn">
          <div className="grid gap-2">
            <strong>Before you can take on more errands</strong>
            {accountBlockers.map((reason) => {
              const info = reasons[reason];
              return <p key={reason} className="text-sm">{info.message} <Link href={info.href} className="font-bold underline">{info.action}</Link></p>;
            })}
          </div>
        </Alert>
      )}
      {eligibility.error && <LoadError onRetry={() => void eligibility.refetch()} />}

      {profile.error && !eligibility.data?.reasons.includes('NO_RUNNER_PROFILE') && (
        <LoadError onRetry={() => void profile.refetch()} />
      )}
      {availabilityError && <LoadError onRetry={() => availability.variables && availability.mutate(availability.variables)} />}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
        <div className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <div><CardTitle>Your active tasks</CardTitle><CardDescription>Keep the requester updated at every step.</CardDescription></div>
              <Link href="/assignments" className="text-xs font-bold text-green-700 hover:underline">Open all</Link>
            </CardHeader>
            {assignments.isPending ? <Skeleton className="h-32 rounded-xl" /> : assignments.error ? (
              <LoadError onRetry={() => void assignments.refetch()} />
            ) : assignments.data?.length ? (
              <div className="grid gap-4">
                {assignments.data.slice(0, 3).map((assignment) => {
                  const step = stepLabel[assignment.errandStatus] ?? { badge: assignment.errandStatus.replaceAll('_', ' '), action: 'View task' };
                  return (
                    <article key={assignment.id} className="grid gap-3.5 rounded-[var(--r-lg)] border border-line bg-surface p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_44px_-18px_rgba(23,33,46,.28)]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge tone={assignment.errandStatus === 'PICKED_UP' ? 'green' : 'blue'} pulse={assignment.errandStatus === 'IN_PROGRESS'}>{step.badge}</Badge>
                        <span className="text-xl font-extrabold tracking-[-0.03em] text-ink">{money(assignment.agreedAmountMinor)}</span>
                      </div>
                      <h3 className="text-base font-extrabold leading-snug tracking-[-0.01em] text-ink">{assignment.errandTitle}</h3>
                      <RouteBox from={assignment.pickupArea ?? 'Pickup area not shared'} to={assignment.destinationArea} />
                      <TaskProgress status={assignment.errandStatus} />
                      <div className="flex flex-wrap gap-2.5">
                        <Link href={`/assignments/${assignment.id}`} className="inline-flex min-h-9 items-center rounded-full bg-ink px-3.5 text-[12.5px] font-bold text-white hover:bg-[#0f1822]">{step.action}</Link>
                        {assignment.conversationId && assignment.errandStatus !== 'RUNNER_SELECTED' ? (
                          <Link
                            href={`/messages/${encodeURIComponent(assignment.conversationId)}`}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-surface px-3.5 text-[12.5px] font-bold text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-panel"
                          >
                            <MessageSquare aria-hidden="true" className="size-4" />Message {assignment.requesterFirstName}
                          </Link>
                        ) : null}
                        <Link href={`/assignments/${assignment.id}`} className="inline-flex min-h-9 items-center rounded-full bg-surface px-3.5 text-[12.5px] font-bold text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-panel">Open task</Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : <SectionEmpty href="/marketplace" action="Find errands">No active tasks right now. Browse nearby errands to find your next job.</SectionEmpty>}
          </Card>

          <Card>
            <CardHeader>
              <div><CardTitle>Errands near you</CardTitle><CardDescription>Open errands in your operating area.</CardDescription></div>
              <Link href="/marketplace" className="text-xs font-bold text-green-700 hover:underline">{nearby.total !== null ? `See all ${nearby.total}` : 'See all'}</Link>
            </CardHeader>
            {eligibility.isLoading || feed.isLoading ? <Skeleton className="h-36 rounded-xl" /> : eligibility.error ? (
              <LoadError onRetry={() => void eligibility.refetch()} />
            ) : !eligibility.data?.canBrowseFeed ? (
              <SectionEmpty href="/verification" action="Check eligibility">Complete your runner setup to browse the marketplace.</SectionEmpty>
            ) : feed.error ? <LoadError onRetry={() => void feed.refetch()} /> : feed.data?.length ? (
              <div>
                {feed.data.slice(0, 5).map((errand) => (
                  <Link key={errand.id} href={`/marketplace/${errand.id}`} className={ROW}>
                    <IconChip tone={errand.boosted ? 'violet' : 'green'}><Package aria-hidden="true" className="size-[18px]" /></IconChip>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm text-ink">{errand.title}</strong>
                      <span className="block truncate text-[12.5px] text-muted">
                        {errand.pickup?.area ?? 'Nearby'}{errand.distance ? ` · ${errand.distance.label}` : ''}{errand.postedAt ? ` · ${formatRelativeTime(errand.postedAt)}` : ''}
                        {errand.boosted ? <span className="ml-1.5 inline-flex rounded-full bg-violet-bg px-2 py-0.5 text-[10px] font-bold text-violet">Boosted</span> : null}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <strong className="block text-base font-extrabold tracking-[-0.02em] text-ink">{money(errand.suggestedBudgetMinor)}</strong>
                      <small className="text-[11px] text-muted">{errand.offerCount} offer{errand.offerCount === 1 ? '' : 's'}</small>
                    </span>
                  </Link>
                ))}
              </div>
            ) : <SectionEmpty href="/marketplace" action="Refresh marketplace">No new errands nearby right now.</SectionEmpty>}
          </Card>
        </div>

        <div className="grid content-start gap-4">
          <Card variant="tint">
            <CardHeader>
              <div><CardTitle>Offer allowance</CardTitle><CardDescription>Resets at midnight, Lagos time</CardDescription></div>
              <span className="inline-flex rounded-full bg-tint-2 px-2.5 py-1 text-[11.5px] font-bold text-green-900">{offerLimit.data?.isPro ? 'Runner Pro' : 'Free plan'}</span>
            </CardHeader>
            {offerLimit.isPending ? <Skeleton className="h-20 rounded-xl" /> : offerLimit.error ? <LoadError onRetry={() => void offerLimit.refetch()} /> : offerLimit.data ? (
              <>
                <Gauge value={offerLimit.data.limit > 0 ? offerLimit.data.used / offerLimit.data.limit * 100 : 0} label={`${offerLimit.data.used} / ${offerLimit.data.limit} offers used today`} />
                {!offerLimit.data.isPro && (
                  <>
                    <Link href="/pro" className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-4 text-[13.5px] font-bold text-white hover:bg-[#0f1822]">
                      <Zap aria-hidden="true" className="size-4 text-lime" />
                      {proProduct ? `Runner Pro · ${money(proProduct.priceMinor)}${proProduct.periodDays ? ` / ${proProduct.periodDays} days` : ''}` : 'Explore Runner Pro'}
                    </Link>
                    <p className="mt-2 text-center text-xs text-muted">A much higher daily offer limit and early access to new errands.</p>
                  </>
                )}
              </>
            ) : null}
          </Card>

          <Card>
            <CardHeader>
              <div><CardTitle>Offers this week</CardTitle><CardDescription>Sent vs selected</CardDescription></div>
              {loading ? null : <span className="inline-flex rounded-full bg-tint-2 px-2.5 py-1 text-[11.5px] font-bold text-green-900">{runner.offersThisWeek} sent</span>}
            </CardHeader>
            {loading ? <Skeleton className="h-[170px] rounded-[var(--r)]" /> : <Bars
              label="Offers sent and times selected in the last seven days"
              items={runner.offersPerDay.map((day) => ({
                key: day.date,
                caption: new Date(`${day.date}T12:00:00+01:00`).toLocaleDateString('en-NG', { weekday: 'short', timeZone: 'Africa/Lagos' }),
                value: day.sent,
                inner: day.selected,
                detail: `${day.sent} sent, ${day.selected} selected`,
              }))}
            />}
            <p className="mt-3 flex items-center gap-4 text-[11.5px] text-muted">
              <span className="inline-flex items-center gap-1.5"><i aria-hidden="true" className="size-2.5 rounded-sm bg-green" />Sent</span>
              <span className="inline-flex items-center gap-1.5"><i aria-hidden="true" className="size-2.5 rounded-sm bg-lime" />Selected</span>
              <span className="ml-auto">{loading ? '' : `${runner.completedLast30Days} completed · 30 days`}</span>
            </p>
          </Card>

          <Card>
            <CardHeader><CardTitle>Reputation</CardTitle><Link href="/runner/history" className="text-xs font-bold text-green-700 hover:underline">Job history</Link></CardHeader>
            {performance.isPending ? <Skeleton className="h-20 rounded-xl" /> : performance.error ? (
              <LoadError onRetry={() => void performance.refetch()} />
            ) : (
              <>
                <div className="flex items-center gap-[18px]">
                  <div
                    role="img"
                    aria-label={completionPercent === null ? 'No completion rate yet' : `${completionPercent} percent completion rate`}
                    className="relative grid size-16 shrink-0 place-items-center rounded-full text-[13px] font-extrabold text-ink"
                    style={{ background: `conic-gradient(var(--green) ${(completionPercent ?? 0) * 3.6}deg, var(--line) 0)` }}
                  >
                    <span aria-hidden="true" className="absolute inset-[7px] rounded-full bg-surface" />
                    <span className="relative">{completionPercent === null ? '—' : `${completionPercent}%`}</span>
                  </div>
                  <div>
                    <strong className="text-sm text-ink">Completion rate</strong>
                    <p className="text-xs text-muted">
                      {performance.data && performance.data.cancellation.sample > 0
                        ? `${completedOfSample} of ${performance.data.cancellation.sample} accepted errands finished`
                        : 'Finish your first accepted errand to see this.'}
                    </p>
                  </div>
                </div>
                <hr className="my-[18px] border-0 border-t border-line" />
                <div className="flex flex-wrap gap-2">
                  {(performance.data?.badges ?? []).map((badge) => isProBadge(badge) ? <ProBadge key={badge} className="py-1 text-[11.5px]" /> : (
                    <span key={badge} className="inline-flex rounded-full bg-tint-2 px-2.5 py-1 text-[11.5px] font-bold text-green-900">{badge.replaceAll('_', ' ')}</span>
                  ))}
                  {performance.data?.response.medianMinutes != null ? (
                    <span className="inline-flex rounded-full bg-panel px-2.5 py-1 text-[11.5px] font-bold text-ink-2">Replies in ~{performance.data.response.medianMinutes} min</span>
                  ) : null}
                  {!performance.data?.badges.length && performance.data?.response.medianMinutes == null ? (
                    <span className="text-xs text-muted">Badges appear as you complete errands.</span>
                  ) : null}
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
