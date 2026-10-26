import { redirect } from 'next/navigation';
import { DashboardPage } from '@/features/dashboard/dashboard-page';
import { getActiveMode, getSession } from '@/lib/auth/session';

export const metadata = { title: 'Dashboard — Urgent.ng' };

/** Time of day in Lagos, so the greeting is right for the person and the same on server and client. */
function greetingForLagos(now = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: 'Africa/Lagos' }).format(now));
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default async function DashboardRoute() {
  const me = await getSession();
  // The access cookie was present but the API refused it: let the browser try one refresh and
  // clear the dead cookies. Sending the user straight to /login loops, because proxy sees a
  // cookie that has not expired and bounces /login back to the app.
  if (!me) redirect('/session?redirect=%2Fdashboard');

  return <DashboardPage mode={await getActiveMode(me)} firstName={me.firstName} greeting={greetingForLagos()} />;
}
