import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { StandingActions } from './standing-actions';
import { StandingDetails } from './standing-details';
import { SessionProvider } from '@/lib/auth/client';

export const metadata = { title: 'Account standing — Urgent.ng' };

const COPY = {
  SUSPENDED: {
    title: 'Your account is suspended',
    text: 'You cannot post errands, send offers or message while the suspension lasts. Contact support if you think this is a mistake.',
  },
  DEACTIVATED: {
    title: 'Your account is deactivated',
    text: 'Reactivate it to post errands and send offers again.',
  },
  DELETION_PENDING: {
    title: 'Your account is scheduled for deletion',
    text: 'It will be removed on the date below unless you cancel the request.',
  },
  DELETED: { title: 'This account is closed', text: 'Create a new account to use Urgent.ng again.' },
} as const;

export default async function StandingPage() {
  const me = await getSession();
  // The access cookie was present but the API refused it: let the browser try one refresh and
  // clear the dead cookies. Sending the user straight to /login loops, because proxy sees a
  // cookie that has not expired and bounces /login back to the app.
  if (!me) redirect('/session?redirect=%2Faccount%2Fstanding');
  if (me.status === 'ACTIVE') redirect('/dashboard');

  const copy = COPY[me.status];

  return (
    <SessionProvider me={me}>
      <div className="mx-auto grid min-h-screen max-w-5xl content-center gap-5 bg-bg p-4 sm:p-6">
        <div className="grid gap-4 rounded-[var(--r-xl)] bg-surface p-6 shadow-[var(--shadow)] sm:p-7">
          <h1 className="text-2xl font-extrabold tracking-[-0.03em]">{copy.title}</h1>
          <p className="text-muted">{copy.text}</p>
          {me.status === 'DELETION_PENDING' && me.deletionScheduledAt ? (
            <p className="rounded-[var(--r-sm)] bg-amber-bg p-3 text-[13px] font-semibold text-amber">
              Deletion date:{' '}
              {new Date(me.deletionScheduledAt).toLocaleDateString('en-NG', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'Africa/Lagos',
              })}
            </p>
          ) : null}
          <StandingActions status={me.status} />
          <Link href="/help" className="text-[13px] font-bold text-green-700 hover:underline">
            Contact support
          </Link>
        </div>
        {me.status !== 'DELETED' ? <StandingDetails /> : null}
      </div>
    </SessionProvider>
  );
}
