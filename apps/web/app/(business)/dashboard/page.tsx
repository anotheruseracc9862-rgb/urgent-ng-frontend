import { redirect } from 'next/navigation';
import { DashboardPage } from '@/features/dashboard/dashboard-page';
import { getActiveMode, getSession } from '@/lib/auth/session';

export const metadata = { title: 'Dashboard — Urgent.ng' };

export default async function DashboardRoute() {
  const me = await getSession();
  if (!me) redirect('/login');

  return <DashboardPage mode={await getActiveMode(me)} firstName={me.firstName} />;
}
