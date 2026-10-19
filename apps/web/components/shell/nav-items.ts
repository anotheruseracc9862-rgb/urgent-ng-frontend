import {
  Bell,
  CircleHelp,
  Compass,
  Flag,
  History,
  LayoutDashboard,
  MessageSquare,
  Package,
  MapPin,
  Receipt,
  Rocket,
  Settings,
  Sparkles,
  Star,
  Tag,
  Truck,
  User,
  Bookmark,
  BadgeCheck,
} from 'lucide-react';
import type { ComponentType } from 'react';

export type ShellMode = 'REQUESTER' | 'RUNNER';

type Icon = ComponentType<{ className?: string }>;

/** What the count badge next to a nav item shows. Filled in by `useNavCounts`. */
export type NavCountKey = 'errands' | 'offers' | 'tasks' | 'messages' | 'notifications' | 'nearby';

export interface NavItem {
  /** Path only. A query that picks a sub-view goes in `query`. */
  href: string;
  query?: Record<string, string>;
  label: string;
  icon: Icon;
  /** Show only in this mode. Omit for both. */
  mode?: ShellMode;
  /** Also shown in the mobile bottom bar. */
  primary?: boolean;
  /** Limit mobile navigation to these modes when the item is otherwise primary. */
  primaryModes?: readonly ShellMode[];
  section?: 'menu' | 'account';
  count?: NavCountKey;
  /** The count needs the person's attention (shown in the alert colour). */
  countAlert?: boolean;
  /** Extra paths that also light this item up. */
  alsoActiveFor?: readonly string[];
}

/**
 * The rail matches the demo (`demo/ui.js`): a short list of working places. Everything else
 * lives in the account menu at the bottom of the rail and on the Profile & account page.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, primary: true },

  { href: '/errands', label: 'My errands', icon: Package, mode: 'REQUESTER', primary: true, count: 'errands' },
  { href: '/track', label: 'Track errand', icon: MapPin, mode: 'REQUESTER', alsoActiveFor: ['/assignments'] },

  { href: '/marketplace', label: 'Find errands', icon: Compass, mode: 'RUNNER', primary: true, count: 'nearby' },
  { href: '/offers', label: 'My offers', icon: Tag, mode: 'RUNNER', count: 'offers' },
  { href: '/assignments', label: 'Active task', icon: Truck, mode: 'RUNNER', primary: true, count: 'tasks' },

  { href: '/messages', label: 'Messages', icon: MessageSquare, primary: true, count: 'messages', countAlert: true },
  { href: '/notifications', label: 'Notifications', icon: Bell, primary: true, primaryModes: ['REQUESTER'], count: 'notifications' },
  { href: '/settings', label: 'Settings', icon: Settings },

  { href: '/profile', label: 'Profile & account', icon: User, primary: true, section: 'account' },
];

export interface AccountMenuItem {
  href: string;
  label: string;
  icon: Icon;
  mode?: ShellMode;
}

/**
 * The account menu (bottom of the rail) and the "more" list on Profile & account. In the demo these
 * are not in the rail: they are one tap away from the person's own card.
 */
export const ACCOUNT_MENU_ITEMS: AccountMenuItem[] = [
  { href: '/profile', label: 'Profile & account', icon: User },
  { href: '/runner/history', label: 'Job history', icon: History, mode: 'RUNNER' },
  { href: '/marketplace/saved', label: 'Saved errands', icon: Bookmark, mode: 'RUNNER' },
  { href: '/verification', label: 'Verification', icon: BadgeCheck, mode: 'RUNNER' },
  { href: '/pro', label: 'Runner Pro', icon: Sparkles, mode: 'RUNNER' },
  { href: '/boosts', label: 'Boosts', icon: Rocket, mode: 'REQUESTER' },
  { href: '/ratings', label: 'Reviews', icon: Star },
  { href: '/settings/notifications', label: 'Notification settings', icon: Bell },
  { href: '/profile/orders', label: 'Orders and receipts', icon: Receipt },
  { href: '/safety', label: 'Safety & support', icon: Flag },
  { href: '/help', label: 'Help centre', icon: CircleHelp },
];

export function accountMenuFor(mode: ShellMode): AccountMenuItem[] {
  return ACCOUNT_MENU_ITEMS.filter((item) => !item.mode || item.mode === mode);
}

export const ROUTE_TITLES: Readonly<Record<string, string>> = {
  '/account/standing': 'Account standing',
  '/onboarding': 'Onboarding',
  '/policy-acceptance': 'Policy acceptance',
  '/verification': 'Verification',
  '/checkout': 'Payment',
  '/settings/contact': 'Contact methods',
  '/settings/notifications': 'Notifications',
  '/profile/orders': 'Orders and receipts',
  '/settings/privacy': 'Privacy',
  '/settings/security': 'Security',
  '/settings/blocked': 'Blocked people',
  '/settings/account': 'Account',
  '/pro': 'Runner Pro',
  '/boosts': 'Boosts',
  '/settings': 'Settings',
  '/ratings': 'Reviews',
  '/safety': 'Safety & support',
  '/runner/history': 'Job history',
  '/marketplace/saved': 'Saved errands',
  '/assignments': 'Active task',
};

export function itemsFor(mode: ShellMode): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.mode || item.mode === mode);
}

export function primaryItemsFor(mode: ShellMode): NavItem[] {
  return itemsFor(mode).filter(
    (item) => item.primary && (!item.primaryModes || item.primaryModes.includes(mode)),
  );
}

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The link an item points at, with its sub-view query. */
export function hrefFor(item: Pick<NavItem, 'href' | 'query'>): string {
  if (!item.query) return item.href;
  return `${item.href}?${new URLSearchParams(item.query).toString()}`;
}

/**
 * Whether an item is the current place. Two items can share a path ("My errands" and
 * "Track errand"): the one whose query matches wins, and the plain one yields to it.
 */
export function isItemActive(item: NavItem, pathname: string, search: URLSearchParams): boolean {
  const here = isActive(pathname, item.href) || (item.alsoActiveFor ?? []).some((extra) => isActive(pathname, extra));
  if (!here) return false;
  if (item.query) {
    return isActive(pathname, item.href) && Object.entries(item.query).every(([key, value]) => search.get(key) === value);
  }
  // The plain item yields when a sibling with a query on the same path is the current view.
  const sibling = NAV_ITEMS.find((other) => other !== item && other.href === item.href && other.query && (!other.mode || other.mode === item.mode));
  if (sibling?.query && pathname === item.href) {
    return !Object.entries(sibling.query).every(([key, value]) => search.get(key) === value);
  }
  return true;
}

export function titleForPath(pathname: string): string {
  if (/^\/marketplace\/[^/]+$/.test(pathname) && pathname !== '/marketplace/saved') return 'Errand details';
  if (/^\/offers\/[^/]+$/.test(pathname)) return 'Offer details';

  const candidates = [
    ...NAV_ITEMS.filter((item) => !item.query).map(({ href, label }) => ({ href, label })),
    ...Object.entries(ROUTE_TITLES).map(([href, label]) => ({ href, label })),
  ];
  const match = candidates
    .filter(({ href }) => isActive(pathname, href))
    .sort((left, right) => right.href.length - left.href.length)[0];
  if (match) return match.label;

  const lastSegment = pathname.split('/').filter(Boolean).at(-1);
  if (!lastSegment) return 'Workspace';
  if (/^(?:[0-9]+|[0-9a-f]{8}-[0-9a-f-]{27,})$/i.test(lastSegment)) return 'Details';
  return lastSegment.replace(/[-_]/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}
