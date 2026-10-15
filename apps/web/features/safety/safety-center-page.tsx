'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Alert, Skeleton } from '@urgent/ui';
import { offersApi } from '@/features/offers/api';
import { queryKeys } from '@/lib/query/keys';
import { BlockUserButton } from '@/features/blocks/block-user-button';
import { CaseError, casePanel } from './case-ui';

export function SafetyCenterPage({ assignmentId }: { assignmentId?: string }) {
  const assignment = useQuery({ queryKey: queryKeys.assignments.detail(assignmentId ?? ''), queryFn: () => offersApi.assignment(assignmentId!), enabled: Boolean(assignmentId), retry: false });
  const current = assignment.data?.data;
  const active = current?.status === 'ACCEPTED';
  const actions = [
    { title: 'Get help', detail: 'Answers to common questions and how Urgent.ng works.', href: '/help' },
    { title: 'Report a concern', detail: 'Safety, prohibited items, behaviour or payment conduct.', href: current ? `/report?targetType=ERRAND&targetId=${current.errandId}` : '/report' },
    { title: 'Your reports', detail: 'Check updates and decisions from the safety team.', href: '/reports' },
    { title: 'Open or view a dispute', detail: current ? 'Review an issue with this errand. An open dispute pauses automatic completion.' : 'Choose your errand, then open Safety & support from its assignment hub.', href: current ? `/assignments/${current.id}/dispute` : '/dashboard' },
    { title: 'Share progress', detail: current ? 'Create or revoke a read-only link for someone you trust.' : 'Choose an active errand, then share progress from its assignment hub.', href: current ? `/errands/${current.errandId}/share` : '/dashboard' },
    { title: 'Manage blocked people', detail: 'Review and unblock people. To block someone new, use their profile or this errand’s Block action.', href: '/settings/blocked' },
  ];
  return <main className="mx-auto grid max-w-5xl gap-5">
    <header><p className="text-xs font-extrabold uppercase tracking-wide text-green-800">We are here to help</p><h1 className="mt-1 text-3xl font-extrabold">Safety & support</h1><p className="mt-2 text-sm text-muted">Report a concern, get help, or review the basics for your errand.</p></header>
    <Alert variant="danger"><strong>In immediate danger?</strong> Call local emergency services first (112 or 199), then report here. Urgent.ng is not an emergency service.</Alert>
    {assignmentId && assignment.isPending ? <Skeleton className="h-20 rounded-xl" /> : null}
    {assignment.error ? <CaseError error={assignment.error} retry={() => void assignment.refetch()} /> : null}
    {current ? <section className={casePanel}><h2 className="font-extrabold">{current.errand.title}</h2><div className="flex flex-wrap items-center gap-3"><Link className="text-sm font-bold text-green-800 underline" href={`/assignments/${current.id}`}>Back to assignment</Link><BlockUserButton userId={current.role === 'REQUESTER' ? current.runnerId : current.requesterId} userName="this errand partner" />{active ? <Link className="text-sm font-bold text-green-800 underline" href={`/assignments/${current.id}/no-show`}>Report a no-show</Link> : null}</div></section> : null}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{actions.map(action => <Link key={action.title} className={`${casePanel} content-start transition-colors hover:border-lime-600 focus-visible:outline-2 focus-visible:outline-green-800`} href={action.href}><h2 className="font-extrabold">{action.title}</h2><p className="text-sm text-muted">{action.detail}</p></Link>)}</div>
    <section className={casePanel}><h2 className="font-extrabold">Safety basics</h2><ul className="grid list-inside list-disc gap-3 text-sm text-ink-2"><li>Keep conversations and agreements in the app.</li><li>Never share OTPs, passwords or full card details.</li><li>Confirm the item and agreed amount before work starts.</li><li>Payment is agreed directly. Urgent.ng never collects or holds it.</li><li>Blocking does not cancel an errand already in progress.</li></ul></section>
  </main>;
}
