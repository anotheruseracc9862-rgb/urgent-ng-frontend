'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { ArrowUpRight, ClipboardList, FileWarning, HelpCircle, MapPin, Scale, Share2, ShieldAlert, ShieldCheck, UserRoundX, Zap } from 'lucide-react';
import { PageHead } from '@/components/shell/page-head';
import { offersApi } from '@/features/offers/api';
import { queryKeys } from '@/lib/query/keys';
import { BlockUserButton } from '@/features/blocks/block-user-button';
import { CaseError } from './case-ui';
import { availableActions } from '@/features/assignments/available-actions';

export function SafetyCenterPage({ assignmentId }: { assignmentId?: string }) {
  const assignment = useQuery({ queryKey: queryKeys.assignments.detail(assignmentId ?? ''), queryFn: () => offersApi.assignment(assignmentId!), enabled: Boolean(assignmentId), retry: false });
  const current = assignment.data?.data;
  const actions = [
    { title: 'Get help', detail: 'Answers to common questions and how Urgent.ng works.', href: '/help', Icon: HelpCircle, tone: 'blue' },
    { title: 'Report a concern', detail: 'Safety, prohibited items, behaviour or payment conduct.', href: current ? `/report?targetType=ERRAND&targetId=${current.errandId}` : '/report', Icon: FileWarning, tone: 'red' },
    { title: 'Your reports', detail: 'Check updates and decisions from the safety team.', href: '/reports', Icon: ClipboardList, tone: 'violet' },
    { title: 'Open or view a dispute', detail: current ? 'Review an issue with this errand. An open dispute pauses automatic completion.' : 'Choose your errand, then open Safety & support from its assignment hub.', href: current ? `/assignments/${current.id}/dispute` : '/dashboard', Icon: Scale, tone: 'amber' },
    { title: 'Share progress', detail: current ? 'Create or revoke a read-only link for someone you trust.' : 'Choose an active errand, then share progress from its assignment hub.', href: current ? `/errands/${current.errandId}/share` : '/dashboard', Icon: Share2, tone: 'green' },
    { title: 'Manage blocked people', detail: 'Review and unblock people. To block someone new, use their profile or this errand’s Block action.', href: '/settings/blocked', Icon: UserRoundX, tone: 'plain' },
  ];
  const actionTone: Record<string, string> = {
    green: 'bg-tint-2 text-green-900',
    blue: 'bg-blue-bg text-blue',
    violet: 'bg-violet-bg text-violet',
    amber: 'bg-amber-bg text-amber',
    red: 'bg-red-bg text-red',
    plain: 'bg-panel text-ink-2',
  } as const;

  return (
    <div className="grid min-w-0 content-start gap-4 pb-10">
      <PageHead
        eyebrow="We are here to help"
        title="Safety & support"
        description="Report a concern, get help, or review the basics for your errand."
      />

      <Alert variant="danger" role="alert">
        <div className="flex items-start gap-3">
          <ShieldAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <p><strong>In immediate danger?</strong> Call local emergency services first (112 or 199), then report here. Urgent.ng is not an emergency service.</p>
        </div>
      </Alert>

      {assignmentId && assignment.isPending ? (
        <section aria-label="Loading assignment" aria-busy="true" className="grid gap-3 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
          <div className="flex items-start gap-3">
            <Skeleton className="size-10 shrink-0 rounded-[13px]" />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-4 w-56 max-w-full" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-36 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-32 rounded-full" />
          </div>
        </section>
      ) : null}
      {assignment.error ? <CaseError error={assignment.error} retry={() => void assignment.refetch()} /> : null}

      {current ? (
        <section aria-label="Current errand" className="grid min-w-0 gap-3 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
          <div className="flex min-w-0 items-start gap-3">
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-tint-2 text-green-900">
              <MapPin className="size-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-[.12em] text-green">Current errand</p>
              <h2 className="mt-1 break-words text-sm font-extrabold text-ink">{current.errand.title}</h2>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link href={`/assignments/${current.id}`}>Back to assignment</Link></Button>
            <BlockUserButton userId={current.role === 'REQUESTER' ? current.runnerId : current.requesterId} userName="this errand partner" />
            {current && availableActions(current.role, current.status, current.errand.status).noShow ? <Button asChild variant="ghost" size="sm"><Link href={`/assignments/${current.id}/no-show`}>Report a no-show</Link></Button> : null}
          </div>
        </section>
      ) : null}

      <section aria-label="Safety and support options" className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {actions.map(({ title, detail, href, Icon, tone }) => (
          <Link
            key={title}
            href={href}
            className="group grid min-w-0 content-start gap-3 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(23,33,46,.04),0_22px_44px_-18px_rgba(23,33,46,.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-600 motion-reduce:transform-none motion-reduce:transition-none sm:p-[22px]"
          >
            <span aria-hidden="true" className={`grid size-10 place-items-center rounded-[13px] ${actionTone[tone]}`}>
              <Icon className="size-[18px]" />
            </span>
            <span className="flex items-start justify-between gap-2">
              <span className="text-sm font-extrabold text-ink">{title}</span>
              <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none" />
            </span>
            <span className="text-[12.5px] leading-relaxed text-muted">{detail}</span>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="grid size-10 place-items-center rounded-[13px] bg-blue-bg text-blue"><ShieldCheck className="size-[18px]" /></span>
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-ink">Safety basics</h2>
            <p className="mt-0.5 text-xs text-muted">A few simple steps help keep every errand safer.</p>
          </div>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {[
            'Keep conversations and agreements in the app.',
            'Never share OTPs, passwords or full card details.',
            'Confirm the item and agreed amount before work starts.',
            'Payment is agreed directly. Urgent.ng never collects or holds it.',
            'Blocking does not cancel an errand already in progress.',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5 rounded-[var(--r-sm)] bg-panel px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-2">
              <Zap aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-green-800" />
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
