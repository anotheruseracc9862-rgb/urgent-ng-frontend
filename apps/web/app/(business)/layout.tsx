import { redirect } from 'next/navigation';
import { BottomNav } from '@/components/shell/bottom-nav';
import { Sidebar } from '@/components/shell/sidebar';
import { Topbar } from '@/components/shell/topbar';
import { SessionProvider } from '@/lib/auth/client';
import { getActiveMode, getSession } from '@/lib/auth/session';

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const me = await getSession();

  if (!me) redirect('/login');
  if (me.status !== 'ACTIVE') redirect('/account/standing');
  if (me.startMode === null) redirect('/onboarding');

  const mode = await getActiveMode(me);

  return (
    <SessionProvider me={me}>
      <div className="grid min-h-screen gap-4 p-3 sm:p-4 lg:grid-cols-[276px_minmax(0,1fr)]">
        <Sidebar mode={mode} />
        <div className="flex min-w-0 flex-col gap-4">
          <Topbar mode={mode} />
          <main className="min-w-0 pb-24 lg:pb-10">{children}</main>
        </div>
      </div>
      <BottomNav mode={mode} />
    </SessionProvider>
  );
}
