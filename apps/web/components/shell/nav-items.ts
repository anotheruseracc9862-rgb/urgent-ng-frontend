import {
  Bell,
  Bookmark,
  History,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Package,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Star,
  User,
} from 'lucide-react';
import type { ComponentType } from 'react';

export type ShellMode = 'REQUESTER' | 'RUNNER';

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Show only in this mode. Omit for both. */
  mode?: ShellMode;
  /** Also shown in the mobile bottom bar. */
  primary?: boolean;
  /** Limit mobile navigation to these modes when the item is otherwise primary. */
  primaryModes?: readonly ShellMode[];
  section?: 'menu' | 'account';
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, primary: true },
  { href: '/errands', label: 'My errands', icon: Package, mode: 'REQUESTER', primary: true },
  { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag, mode: 'RUNNER', primary: true },
  { href: '/marketplace/saved', label: 'Saved errands', icon: Bookmark, mode: 'RUNNER' },
  { href: '/offers', label: 'My offers', icon: Star, mode: 'RUNNER' },
  { href: '/runner/history', label: 'Job history', icon: History, mode: 'RUNNER' },
  { href: '/assignments', label: 'Assignments', icon: MapPin, mode: 'RUNNER', primary: true },
  { href: '/messages', label: 'Messages', icon: MessageSquare, primary: true },
  { href: '/notifications', label: 'Notifications', icon: Bell, primary: true, primaryModes: ['REQUESTER'] },
  { href: '/ratings', label: 'Reviews', icon: Star },
  { href: '/safety', label: 'Safety & support', icon: ShieldCheck },
  { href: '/profile', label: 'Profile & account', icon: User, primary: true, section: 'account' },
  { href: '/settings', label: 'Settings', icon: Settings, section: 'account' },
];

export const ROUTE_TITLES: Readonly<Record<string, string>> = {
  '/account/standing': 'Account standing',
  '/onboarding': 'Onboarding',
  '/policy-acceptance': 'Policy acceptance',
  '/verification': 'Verification',
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

export function titleForPath(pathname: string): string {
  const candidates = [
    ...NAV_ITEMS.map(({ href, label }) => ({ href, label })),
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
