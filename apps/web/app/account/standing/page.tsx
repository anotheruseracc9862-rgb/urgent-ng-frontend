import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { StandingActions } from './standing-actions';

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
  if (!me) redirect('/login');
  if (me.status === 'ACTIVE') redirect('/dashboard');

  const copy = COPY[me.status];

  return (
    <div className="grid min-h-screen place-items-center bg-bg p-4">
      <div className="grid w-full max-w-[460px] gap-4 rounded-[var(--r-xl)] bg-surface p-7 shadow-[var(--shadow)]">
        <h1 className="text-2xl font-extrabold tracking-[-0.03em]">{copy.title}</h1>
        <p className="text-muted">{copy.text}</p>
        {me.status === 'DELETION_PENDING' && me.deletionScheduledAt ? (
          <p className="rounded-[var(--r-sm)] bg-amber-bg p-3 text-[13px] font-semibold text-amber">
            Deletion date:{' '}
            {new Date(me.deletionScheduledAt).toLocaleDateString('en-NG', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        ) : null}
        <StandingActions status={me.status} />
        <Link href="/help" className="text-[13px] font-bold text-green-700 hover:underline">
          Contact support
        </Link>
      </div>
    </div>
  );
}
