"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, LockKeyhole, MoreHorizontal } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@urgent/ui';
import type { ApiResult } from '@urgent/api-client';
import { PageHead } from '@/components/page-head';
import { adminRequest } from '@/lib/api/client';
import { safeAdminReturnTo } from '@/lib/auth/shared';
import { allowed, canVisit, labelFor, recordPath, valueAt } from './access';
import { ActionResult, canAct, ReasonDialog, type AdminAction } from './actions';
import { resources } from './catalog';
import { endpoint } from './contracts';
import { detailLocation, resourceLocation } from './navigation';
import { AccessDenied, DataTable, DisplayValue, ErrorState, LoadingState, Pagination, RecordView, StatusBadge } from './presentation';
import { AuditPanel, RelatedPanel } from './related';
import { useAdmin } from './shell';
import { RecordDrawer } from './workspace';

function Fields({ record, names }: { record: unknown; names: string[] }) {
  return <dl className="record-fields">{names.filter(name => valueAt(record, name) !== undefined).map(name => <div key={name}><dt>{labelFor(name.split('.').pop()!)}</dt><dd><DisplayValue name={name.split('.').pop()} value={valueAt(record, name)} /></dd></div>)}</dl>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="panel stack"><h2>{title}</h2>{children}</section>;
}

/** Related lists retain their own permissions and cursor; they never fetch the whole marketplace. */
function LinkedQueue({ slug, query, onOpen }: { slug: string; query: Record<string, string>; onOpen?: (row: Record<string, unknown>) => void }) {
  const admin = useAdmin();
  const resource = resources.find(r => r.slug === slug)!;
  const granted = canVisit(admin, resource);
  const [cursor, setCursor] = useState<string | null>(null);
  const list = useQuery({ queryKey: ['admin', 'linked', slug, query, cursor], queryFn: ({ signal }) => adminRequest<unknown[]>(resource.list!, { query: { ...query, cursor: cursor ?? undefined }, signal }), enabled: granted, gcTime: 0 });
  if (!granted) return null;
  return <Section title={resource.title}>{list.isPending ? <LoadingState /> : list.isError ? <ErrorState error={list.error} retry={() => void list.refetch()} /> : <><DataTable rows={list.data.data} columns={resource.columns.slice(0, 5)} onOpen={onOpen} /><Pagination meta={list.data.meta} count={list.data.data.length} cursor={cursor} onCursor={setCursor} /></>}</Section>;
}

export function RecordPage({ slug, id }: { slug: string; id: string }) {
  const admin = useAdmin();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const resource = resources.find(r => r.slug === slug)!;
  const [tab, setTab] = useState(params.has('assignment') ? 'Execution' : params.has('offer') ? 'Offers' : 'Overview');
  const [action, setAction] = useState<AdminAction | null>(null);
  const [result, setResult] = useState<ApiResult<unknown> | null>(null);
  const [review, setReview] = useState<{ slug: string; id: string; row?: Record<string, unknown> } | null>(null);
  const granted = canVisit(admin, resource);
  const detail = useQuery({ queryKey: ['admin', 'detail', slug, id], queryFn: ({ signal }) => adminRequest<Record<string, unknown>>(recordPath(resource.detail!, id), { signal }), enabled: granted, gcTime: 0 });
  if (!granted) return <AccessDenied />;
  if (detail.isPending) return <LoadingState />;
  if (detail.isError) return <ErrorState error={detail.error} retry={() => void detail.refetch()} />;
  const record = detail.data.data;
  const back = params.get('back');
  const backHref = back && safeAdminReturnTo(back) === back ? back : resourceLocation(slug);
  const isUser = slug === 'users';
  const isErrand = slug === 'errands';
  const isOrder = slug === 'orders';
  const tabs = isUser ? ['Overview', 'Trust', 'Activity', 'Access & services'] : isErrand ? ['Overview', 'Offers', 'Execution', 'Activity'] : isOrder ? ['Overview', 'Payments', 'Refunds', 'Activity'] : ['Overview', 'Evidence', 'Activity'];
  const title = String(record.name ?? record.title ?? valueAt(record, 'errand.title') ?? `${isOrder ? 'Order' : slug === 'reports' ? 'Report' : 'Dispute'} ${id.slice(0, 8)}`);
  const related = resource.related?.filter(r => allowed(admin, endpoint('GET', r.path))) ?? [];
  function relatedSection(label: string) {
    const item = related.find(r => r.label === label);
    return item && <Section key={item.path} title={label}><RelatedPanel path={item.path} id={id} sensitive={item.sensitive} columns={label === 'Verifications' ? ['status', 'attemptNumber', 'failureReason', 'startedAt', 'completedAt'] : undefined} onOpen={label === 'Verifications' ? row => setReview({ slug: 'verifications', id: String(row.id), row }) : undefined} /></Section>;
  }
  const actions = resource.actions?.filter(a => a.scope === 'record' && canAct(a, record, admin)) ?? [];
  const primary = actions.filter(a => /start-review|\/notes$|\/assign$|\/resolve$/.test(a.path));
  const more = actions.filter(a => !primary.includes(a));
  const personLink = (name: string) => {
    const person = valueAt(record, name);
    const userId = valueAt(person, 'id');
    if (!person) return null;
    return <div key={name} className="participant"><span className="admin-avatar" aria-hidden="true">{String(valueAt(person, 'name') ?? '?').slice(0, 1)}</span><div><small>{labelFor(name)}</small>{admin.permissions.includes('USERS_VIEW') && typeof userId === 'string' ? <Link href={detailLocation('users', userId)!} prefetch={false}>{String(valueAt(person, 'name') ?? userId)} ↗</Link> : <b>{String(valueAt(person, 'name') ?? userId ?? 'Not provided')}</b>}</div></div>;
  };
  const selected = isErrand && params.get('assignment') ? { slug: 'assignments', id: params.get('assignment')! } : isErrand && params.get('offer') ? { slug: 'offers', id: params.get('offer')! } : review;
  function selectRelated(key?: 'assignment' | 'offer', value?: string) {
    const next = new URLSearchParams(params);
    next.delete('assignment'); next.delete('offer');
    if (key && value) next.set(key, value);
    router.push(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false });
  }
  const openRow = (source: string) => (row: Record<string, unknown>) => {
    const detail = detailLocation(source, String(row.id));
    if (detail) router.push(detail);
    else if (isErrand && ['assignments', 'offers'].includes(source)) selectRelated(source === 'assignments' ? 'assignment' : 'offer', String(row.id));
    else setReview({ slug: source, id: String(row.id), row });
  };
  return <div className="stack record-page">
    <Link className="text-button back-link" href={backHref} prefetch={false}><ArrowLeft size={16} />Back to {isUser ? 'users' : isErrand ? 'errands' : isOrder ? 'transactions' : 'disputes & reports'}</Link>
    <PageHead eyebrow={isUser ? 'User account' : isErrand ? 'Errand' : isOrder ? 'Platform purchase' : slug === 'reports' ? 'Safety report' : 'Dispute'} title={title} description={<span className="mono record-id">{id}</span>} actions={<StatusBadge value={String(record.status ?? 'UNKNOWN')} />} />
    {result && <ActionResult result={result} />}
    <div className="detail-layout"><div className="stack detail-content">
      <Tabs value={tab} onValueChange={setTab}><TabsList aria-label="Record sections">{tabs.map(t => <TabsTrigger key={t} value={t}>{t}</TabsTrigger>)}</TabsList>
      <TabsContent key={tab} value={tab} className="stack">
      {tab === 'Overview' && <>
        <Section title={isUser ? 'Account overview' : isOrder ? 'Order overview' : 'Overview'}>
          {(record.description || record.claim || record.bio) ? <p className="record-narrative">{String(record.description ?? record.claim ?? record.bio)}</p> : null}
          <Fields record={record} names={isUser ? ['status', 'homeArea', 'startMode', 'verified', 'activeRestrictions', 'createdAt', 'lastLoginAt', 'stats', 'counts', 'deletion'] : isErrand ? ['category.name', 'category.flow', 'priority', 'timeMode', 'scheduledAt', 'suggestedBudgetMinor', 'offerCount', 'publishedAt', 'expiresAt', 'locations'] : isOrder ? ['type', 'amountMinor', 'currency', 'createdAt', 'paidAt'] : ['type', 'openedBy', 'assignedTo', 'slaDueAt', 'resolutionDueAt', 'firstResponseAt', 'escalatedAt', 'createdAt', 'resolution', 'resolutionNotes', 'resolvedAt']} />
        </Section>
        {isUser && <Section title="Identity and account state"><Fields record={record} names={['verification', 'reliability', 'badges', 'restrictions']} /></Section>}
        {!isUser && <Section title="People and related work"><div className="participants">{['requester', 'runner', 'buyer'].map(personLink)}</div>
          {typeof valueAt(record, 'errand.id') === 'string' && admin.permissions.includes('ERRANDS_VIEW') && <Link className="text-button" prefetch={false} href={detailLocation('errands', String(valueAt(record, 'errand.id')))!}>{String(valueAt(record, 'errand.title') ?? 'Open errand')} ↗</Link>}
          {typeof record.targetErrandId === 'string' && admin.permissions.includes('ERRANDS_VIEW') && <Link className="text-button" prefetch={false} href={detailLocation('errands', record.targetErrandId)!}>Open target errand ↗</Link>}
          {isErrand && record.assignment ? <><Fields record={record} names={['assignment.status', 'assignment.agreedAmountMinor', 'assignment.runner.name']} />{admin.permissions.includes('ASSIGNMENTS_VIEW') && <button className="text-button" onClick={() => selectRelated('assignment', String(valueAt(record, 'assignment.id')))}>Review current assignment ↗</button>}</> : null}
          {!isErrand && typeof record.assignmentId === 'string' && admin.permissions.includes('ASSIGNMENTS_VIEW') && <button className="text-button" onClick={() => setReview({ slug: 'assignments', id: String(record.assignmentId) })}>Review related assignment ↗</button>}
        </Section>}
        {!isUser && !isOrder && record.paymentAgreement ? <Section title="Payment note"><p className="context-note">Optional note between participants. Urgent.ng does not collect or enforce this payment.</p><RecordView value={record.paymentAgreement} /></Section> : null}
      </>}
      {isUser && tab === 'Trust' && <>{relatedSection('Verifications')}{relatedSection('Enforcement')}{relatedSection('Ladder')}{relatedSection('Badges')}</>}
      {isUser && tab === 'Access & services' && <>{relatedSection('Contact')}{relatedSection('Consents')}{relatedSection('Pro subscription')}{relatedSection('Entitlements')}{allowed(admin, endpoint('GET', '/offer-limits/{userId}')) && <Section title="Offer allowance"><RelatedPanel path="/offer-limits/{userId}" id={id} />{allowed(admin, endpoint('POST', '/offer-limits/{userId}/reset')) && <button className="button" onClick={() => setAction(resources.find(r => r.slug === 'offer-limits')!.actions![0])}>Reset offer allowance</button>}</Section>}<p className="context-note">Contact and identity information require explicit, audited access. Session and account actions are available in the action panel.</p></>}
      {isUser && tab === 'Activity' && <><LinkedQueue slug="errands" query={{ requesterId: id }} onOpen={openRow('errands')} /><LinkedQueue slug="assignments" query={{ runnerId: id }} onOpen={openRow('assignments')} /><LinkedQueue slug="assignments" query={{ requesterId: id }} onOpen={openRow('assignments')} /></>}
      {isErrand && tab === 'Offers' && <Section title="Offers"><RelatedPanel path="/errands/{id}/offers" id={id} columns={['runner.name', 'status', 'amountMinor', 'durationMinutes', 'awaitingParty']} onOpen={openRow('offers')} /></Section>}
      {isErrand && tab === 'Execution' && <><LinkedQueue slug="assignments" query={{ errandId: id }} onOpen={openRow('assignments')} />{typeof record.conversationId === 'string' && <Section title="Assignment conversation"><RelatedPanel path="/conversations/{id}/messages" id={record.conversationId} sensitive /></Section>}</>}
      {isErrand && tab === 'Activity' && <>{relatedSection('Timeline')}<LinkedQueue slug="disputes" query={{ errandId: id }} onOpen={openRow('disputes')} /><LinkedQueue slug="reports" query={{ errandId: id }} onOpen={openRow('reports')} /></>}
      {!isUser && !isErrand && !isOrder && tab === 'Evidence' && <><Section title="Evidence references"><Fields record={record} names={['evidence', 'checkpoints', 'problems']} /></Section>{relatedSection('Case chat')}</>}
      {!isUser && !isErrand && !isOrder && tab === 'Activity' && <Section title="Timeline and staff notes"><Fields record={record} names={['timeline', 'notes', 'reports']} /></Section>}
      {isOrder && tab === 'Payments' && <Section title="Payment attempts"><DataTable rows={Array.isArray(record.payments) ? record.payments : []} columns={['reference', 'status', 'amountMinor', 'paidAt']} onOpen={row => setReview({ slug: 'payments', id: String(row.id), row: { id: row.id, data: row } })} /></Section>}
      {isOrder && tab === 'Refunds' && <Section title="Refund history"><DataTable rows={Array.isArray(record.refunds) ? record.refunds : []} columns={['status', 'amountMinor', 'reason', 'requestedById', 'approvedBy']} onOpen={row => setReview({ slug: 'refunds', id: String(row.id), row: { id: row.id, data: row } })} /><Link className="text-button" href={resourceLocation('refunds')} prefetch={false}>Open refund queue ↗</Link></Section>}
      {tab === 'Activity' && admin.permissions.includes('AUDIT_VIEW') && <Section title="Administrative audit"><AuditPanel id={id} /></Section>}
      </TabsContent></Tabs>
    </div><aside className="stack detail-aside">
      <Section title="Actions">{primary.map(a => <button className="button primary" key={a.path} onClick={() => setAction(a)}>{labelFor(a.label)}</button>)}
        {more.length > 0 && <details className="more-actions" open={primary.length === 0}><summary><MoreHorizontal size={18} />{primary.length ? 'More actions' : 'Account & record actions'}</summary><div className="stack">{more.map(a => <button className="button" key={a.path} onClick={() => setAction(a)}>{labelFor(a.label)}</button>)}</div></details>}
        {!actions.length && <p className="muted">Read-only access. No actions are available to your account here.</p>}<p className="context-note">Changes require a reason where specified and are checked by the server. High-risk requests may need another administrator.</p>
      </Section>
      {isErrand && related.find(r => r.label === 'Exact locations') && <Section title="Private location details"><LockKeyhole size={20} /><RelatedPanel path="/errands/{id}/locations" id={id} sensitive /></Section>}
      <details className="panel"><summary>Technical details</summary><RecordView value={record} /></details>
    </aside></div>
    {action && <ReasonDialog action={action} id={id} record={record} onClose={() => setAction(null)} onResult={setResult} />}
    {selected && <RecordDrawer key={`${selected.slug}:${selected.id}`} resource={resources.find(r => r.slug === selected.slug)!} id={selected.id} row={'row' in selected ? selected.row : undefined} onClose={() => { setReview(null); if (params.has('assignment') || params.has('offer')) selectRelated(); }} onResult={setResult} />}
  </div>;
}
