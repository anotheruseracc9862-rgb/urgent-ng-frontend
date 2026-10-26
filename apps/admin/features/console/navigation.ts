import type { AdminView } from '@/lib/auth/shared';
import { canVisit } from './access';
import { resources } from './catalog';
import { endpoint } from './contracts';

export const workspaces = [
  { slug: 'users', title: 'Users', description: 'Find accounts, review verification and manage account access.', tabs: [
    { title: 'Accounts', sources: ['users'] }, { title: 'Verification', sources: ['verifications'] },
  ] },
  { slug: 'errands', title: 'Errands', description: 'Follow each errand from offers to assignment and completion.', tabs: [
    { title: 'Errands', sources: ['errands', 'offers'] }, { title: 'Assignments', sources: ['assignments'] },
  ] },
  { slug: 'cases', title: 'Disputes & Reports', description: 'Review disputes, safety reports and related moderation decisions.', tabs: [
    { title: 'Disputes', sources: ['disputes'] }, { title: 'Reports', sources: ['reports', 'no-shows'] },
    { title: 'Enforcement', sources: ['enforcement', 'appeals', 'enforcement-reviews', 'blocklist'] },
    { title: 'Moderation', sources: ['ratings', 'risk-flags', 'conversations', 'messages', 'media'] },
  ] },
  { slug: 'billing', title: 'Billing', description: 'Investigate platform purchases, refunds and paid services.', tabs: [
    { title: 'Transactions', sources: ['orders', 'payments', 'webhooks'] }, { title: 'Refunds', sources: ['refunds'] },
    { title: 'Subscriptions', sources: ['subscriptions', 'offer-limits', 'entitlements'] }, { title: 'Boosts', sources: ['boosts'] },
  ] },
  { slug: 'insights', title: 'Insights', description: 'Understand marketplace performance and review administrative activity.', tabs: [
    { title: 'Performance', sources: ['analytics-overview', 'analytics-funnel', 'analytics-revenue', 'analytics-supply-demand'] },
    { title: 'Audit', sources: ['audit', 'auth-events'] },
  ] },
  { slug: 'settings', title: 'Settings', description: 'Manage marketplace rules, pricing and platform configuration.', tabs: [
    { title: 'Marketplace', sources: ['categories', 'prohibited', 'reference-reasons'] },
    { title: 'Commerce', sources: ['pricing'] }, { title: 'Communications', sources: ['templates', 'deliveries'] },
    { title: 'Platform', sources: ['config', 'flags', 'policies'] },
  ] },
  { slug: 'administration', title: 'Administration', description: 'Review approvals, staff access, data requests and system health.', tabs: [
    { title: 'Approvals', sources: ['approvals'] }, { title: 'Staff', sources: ['admins', 'roles'] },
    { title: 'Data requests', sources: ['data-requests'] }, { title: 'System', sources: ['queues', 'outbox', 'sweepers'] },
  ] },
];

export type Workbench = typeof workspaces[number];
export const tabKey = (title: string) => title.toLowerCase().replaceAll(' ', '-');
export function visibleTabs(workspace: Workbench, admin: AdminView) {
  return workspace.tabs.map(tab => ({ ...tab, sources: tab.sources.filter(slug => {
    const resource = resources.find(r => r.slug === slug);
    return !!resource && canVisit(admin, resource);
  }) })).filter(tab => tab.sources.length);
}

/** Every legacy resource has one canonical task surface; aliases never become more navigation. */
export function resourceLocation(slug: string, values: Record<string, string> = {}): string {
  const workspace = workspaces.find(w => w.tabs.some(t => t.sources.includes(slug)));
  const tab = workspace?.tabs.find(t => t.sources.includes(slug));
  if (!workspace || !tab) return '/dashboard';
  const operation = resources.find(r => r.slug === slug)?.list;
  const keys = ['record', 'columns', ...(operation ? endpoint('GET', operation).query.map(f => f.name) : [])];
  // Persist queue controls, never free-text searches or investigation reasons.
  const safe = Object.fromEntries(Object.entries(values).filter(([key]) =>
    !['q', 'reasonCode', 'reasonText', 'back', 'tab', 'view'].includes(key) &&
    keys.includes(key)));
  return `/${workspace.slug}?${new URLSearchParams({ ...safe, tab: tabKey(tab.title), view: slug })}`;
}

export function detailLocation(slug: string, id: string): string | undefined {
  const encoded = encodeURIComponent(id);
  if (slug === 'users' || slug === 'errands') return `/${slug}/${encoded}`;
  if (slug === 'disputes' || slug === 'reports') return `/cases/${slug}/${encoded}`;
  if (slug === 'orders') return `/billing/orders/${encoded}`;
}
