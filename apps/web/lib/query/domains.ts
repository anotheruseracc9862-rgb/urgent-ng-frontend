import type { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * The cache is organised in domains, one per root of the query keys. This file is the single place
 * that says which domains a change reaches. Three mechanisms read it, so they cannot drift apart:
 *
 *   - mutations   (`useApiMutation({ affects: [...] })`)
 *   - realtime    (`features/realtime/event-dispatcher.ts`)
 *   - other tabs  (`lib/query/broadcast.ts`)
 */
export const DOMAINS = [
  'auth',
  'account',
  'dashboard',
  'errands',
  'marketplace',
  'offers',
  'assignments',
  'runner',
  'notifications',
  'conversations',
  'billing',
  'users',
  'blocks',
  'verification',
  'security',
  'consents',
  'reference',
] as const;

export type Domain = (typeof DOMAINS)[number];

export function keyOf(domain: Domain): QueryKey {
  return [domain];
}

/**
 * When a domain changes, these other domains show something derived from it and must refresh too.
 * One hop only: list every domain a change can reach, not a chain.
 */
const ALSO_REFRESH: Record<Domain, readonly Domain[]> = {
  auth: ['dashboard'],
  account: ['auth', 'dashboard'],
  dashboard: [],
  errands: ['dashboard', 'marketplace', 'offers', 'assignments', 'conversations'],
  marketplace: ['dashboard', 'runner'],
  offers: ['errands', 'dashboard', 'marketplace', 'runner', 'conversations'],
  assignments: ['errands', 'offers', 'dashboard', 'runner', 'conversations'],
  runner: ['dashboard', 'marketplace'],
  notifications: [],
  conversations: ['notifications'],
  billing: ['runner', 'marketplace', 'errands', 'dashboard', 'verification'],
  users: ['dashboard'],
  blocks: ['marketplace', 'errands', 'offers', 'conversations'],
  verification: ['runner', 'dashboard'],
  security: [],
  consents: [],
  reference: [],
};

/** The domains plus everything derived from them. */
export function expandDomains(domains: readonly Domain[]): Domain[] {
  const all = new Set<Domain>();
  for (const domain of domains) {
    all.add(domain);
    for (const other of ALSO_REFRESH[domain]) all.add(other);
  }
  return [...all];
}

export async function invalidateDomains(client: QueryClient, domains: readonly Domain[]): Promise<void> {
  await Promise.all(expandDomains(domains).map((domain) => client.invalidateQueries({ queryKey: keyOf(domain) })));
}

/**
 * Realtime event types (the prefix before the first dot, or the whole type) and the domains they
 * change. Anything not listed refreshes nothing.
 */
export const EVENT_DOMAINS: ReadonlyArray<readonly [prefix: string, domains: readonly Domain[]]> = [
  ['notification.', ['notifications']],
  ['message.', ['conversations']],
  ['conversation.', ['conversations']],
  ['offer.', ['offers']],
  ['assignment.', ['assignments']],
  ['errand.', ['errands']],
  ['execution.', ['assignments']],
  ['location.', ['assignments']],
  ['runner.location.', ['assignments']],
  ['change_request.', ['assignments']],
  ['payment_agreement.', ['assignments']],
  ['no_show.', ['assignments']],
  ['problem.', ['assignments']],
  ['order.', ['billing']],
  ['subscription.', ['billing']],
  ['boost.', ['billing']],
  ['verification.', ['verification']],
  ['badge.', ['runner']],
  ['rating.', ['users', 'runner']],
];

export function domainsForEvent(type: string): Domain[] {
  const match = EVENT_DOMAINS.find(([prefix]) => type.startsWith(prefix));
  return match ? [...match[1]] : [];
}
