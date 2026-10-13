import {
  Bell,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Package,
  Settings,
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
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, primary: true },
  { href: '/errands', label: 'My errands', icon: Package, mode: 'REQUESTER', primary: true },
  { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag, mode: 'RUNNER', primary: true },
  { href: '/offers', label: 'My offers', icon: Star, mode: 'RUNNER' },
  { href: '/assignments', label: 'Assignments', icon: MapPin, mode: 'RUNNER', primary: true },
  { href: '/messages', label: 'Messages', icon: MessageSquare, primary: true },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/profile', label: 'Profile', icon: User, primary: true },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function itemsFor(mode: ShellMode): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.mode || item.mode === mode);
}

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
