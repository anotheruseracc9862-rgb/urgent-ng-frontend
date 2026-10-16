'use client';
import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { Sidebar } from '@/components/shell/sidebar';
import { Topbar } from '@/components/shell/topbar';
import { BottomNav } from '@/components/shell/bottom-nav';
import type { ShellMode } from '@/components/shell/nav-items';

const me: Me = {
  id: 'settings-preview-user', name: 'Ada Okafor', firstName: 'Ada', lastName: 'Okafor',
  phone: '+2348031234567', phoneVerified: true, email: null, emailVerified: false,
  status: 'ACTIVE', startMode: 'REQUESTER', photoMediaId: null, bio: null, homeArea: 'Lekki, Lagos',
  deletionScheduledAt: null, createdAt: '2025-03-10T00:00:00.000Z',
};
export function SettingsPreviewShell({ children }: { children: React.ReactNode }) {
  const search = useSearchParams();
  const [mode] = React.useState<ShellMode>(() => search.get('mode') === 'runner' ? 'RUNNER' : 'REQUESTER');
  React.useEffect(() => { window.history.replaceState(null, '', '/settings'); }, []);
  return <SessionProvider me={me}>
    <div className="grid min-h-screen gap-4 p-3 sm:p-4 lg:grid-cols-[276px_minmax(0,1fr)]">
      <Sidebar mode={mode} name={me.name} />
      <div className="flex min-w-0 flex-col gap-4">
        <Topbar mode={mode} />
        <main className="min-w-0 pb-24 lg:pb-10">{children}</main>
      </div>
    </div>
    <BottomNav mode={mode} />
  </SessionProvider>;
}
