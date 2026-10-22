"use client";

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@urgent/ui';
import { PageHead } from '@/components/page-head';
import { resources } from './catalog';
import { canVisit } from './access';
import { resourceLocation, tabKey, visibleTabs, type Workbench as WorkbenchDefinition } from './navigation';
import { AccessDenied } from './presentation';
import { useAdmin } from './shell';
import { Workspace } from './workspace';

export function Workbench({ workspace }: { workspace: WorkbenchDefinition }) {
  const admin = useAdmin();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tabs = visibleTabs(workspace, admin);
  const tab = tabs.find(t => tabKey(t.title) === params.get('tab')) ?? tabs[0];
  if (!tab) return <AccessDenied />;
  const slug = tab.sources.includes(params.get('view') ?? '') ? params.get('view')! : tab.sources[0];
  const resource = resources.find(r => r.slug === slug)!;
  function select(title: string, source: string) {
    // New source means a new filter/cursor scope. Never reuse a cursor across APIs.
    router.push(`${pathname}?${new URLSearchParams({ tab: tabKey(title), view: source })}`, { scroll: false });
  }
  return <div className="stack workbench">
    <PageHead eyebrow={['insights', 'settings', 'administration'].includes(workspace.slug) ? 'Manage' : 'Work'} title={workspace.title} description={workspace.description} />
    <Tabs value={tabKey(tab.title)} onValueChange={value => { const next = tabs.find(t => tabKey(t.title) === value)!; select(next.title, next.sources[0]); }}>
      <TabsList aria-label={`${workspace.title} sections`}>{tabs.map(t => <TabsTrigger key={t.title} value={tabKey(t.title)}>{t.title}</TabsTrigger>)}</TabsList>
    <TabsContent value={tabKey(tab.title)} className="stack">
    {workspace.slug === 'administration' && tab.title === 'System' && canVisit(admin, resources.find(r => r.slug === 'webhooks')!) && <p className="context-note">Payment webhook records are technical billing tools. <Link prefetch={false} href={resourceLocation('webhooks')}>Open payment webhooks in Billing ↗</Link></p>}
    {slug === 'data-requests' && <p className="notice">This queue tracks fulfilment by staff. Marking a request completed does not export or erase data automatically.</p>}
    {slug === 'boosts' && <p className="context-note">Boosts stay active through selection and end on acceptance, cancellation or expiry. Ending a boost does not itself issue a refund.</p>}
    <Workspace key={slug} leading={tab.sources.length > 1 ? <label className="field source-select">{tab.title} view<select value={slug} onChange={e => select(tab.title, e.target.value)}>{tab.sources.map(s => <option key={s} value={s}>{resources.find(r => r.slug === s)!.title.replace('Analytics: ', '')}</option>)}</select></label> : undefined} resource={resource} resetScope={!!params.get('view') && params.get('view') !== slug || !!params.get('tab') && params.get('tab') !== tabKey(tab.title)} />
    </TabsContent></Tabs>
  </div>;
}
