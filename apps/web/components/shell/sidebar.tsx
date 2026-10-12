'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  MessageSquare, 
  Bell, 
  User, 
  Settings,
  Plus,
  ShoppingBag,
  Star,
  MapPin,
} from 'lucide-react';
import { cn } from '@urgent/ui';

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
  requesterOnly?: boolean;
  runnerOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/errands', icon: Package, label: 'My Errands', requesterOnly: true },
  { href: '/marketplace', icon: ShoppingBag, label: 'Marketplace', runnerOnly: true },
  { href: '/offers', icon: Star, label: 'My Offers', runnerOnly: true },
  { href: '/assignments', icon: MapPin, label: 'Assignments', runnerOnly: true },
  { href: '/messages', icon: MessageSquare, label: 'Messages', badge: 3 },
  { href: '/notifications', icon: Bell, label: 'Notifications', badge: 5 },
  { href: '/profile', icon: User, label: 'Profile' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar({ mode }: { mode: 'REQUESTER' | 'RUNNER' }) {
  const pathname = usePathname();

  const filteredItems = navItems.filter(item => {
    if (item.requesterOnly && mode !== 'REQUESTER') return false;
    if (item.runnerOnly && mode !== 'RUNNER') return false;
    return true;
  });

  return (
    <aside className="sticky top-4 flex flex-col h-[calc(100vh-32px)] p-[18px_14px_14px] rounded-[var(--r-xl)] bg-surface shadow-[var(--shadow)] overflow-y-auto">
      <Link href="/dashboard" className="flex items-center gap-2.5 px-2 pb-[18px]">
        <div className="w-[30px] h-[30px] bg-lime rounded-lg" />
        <span className="font-extrabold text-lg">Urgent</span>
      </Link>

      {mode === 'REQUESTER' && (
        <Link
          href="/errands/new"
          className="flex items-center justify-center gap-2 mx-1.5 mb-[18px] px-3.5 py-3 rounded-full bg-ink text-white text-[13px] font-bold hover:bg-[#0f1822] transition-colors"
        >
          <Plus className="w-4 h-4 text-lime" />
          New Errand
        </Link>
      )}

      <nav className="grid gap-0.5">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-full text-[13.5px] font-semibold transition-all',
                isActive
                  ? 'bg-ink text-white'
                  : 'text-ink-2 hover:bg-panel'
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0', isActive ? 'text-lime' : 'text-muted')} />
              <span>{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className={cn(
                  'ml-auto min-w-[22px] px-1.5 py-0.5 rounded-full text-[11px] font-extrabold text-center',
                  isActive ? 'bg-lime text-ink' : 'bg-[#ff7a45] text-white'
                )}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
