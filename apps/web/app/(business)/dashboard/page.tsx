import Link from 'next/link';
import { getActiveMode, getSession } from '@/lib/auth/session';

export const metadata = { title: 'Dashboard — Urgent.ng' };

export default async function DashboardPage() {
  const me = await getSession();
  if (!me) return null;
  const mode = await getActiveMode(me);

  return (
    <div className="grid gap-4">
      <section className="rounded-[var(--r-lg)] bg-gradient-to-br from-[#f1fadb] to-surface p-6 shadow-[var(--shadow)]">
        <p className="text-[12px] font-extrabold uppercase tracking-[.06em] text-green-700">
          {mode === 'RUNNER' ? 'Runner' : 'Requester'}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em]">Hello, {me.firstName}</h1>
        <p className="mt-1 text-muted">
          {mode === 'RUNNER'
            ? 'Errands near you will show up in the marketplace.'
            : 'Post an errand and runners will send you offers.'}
        </p>
        {mode === 'REQUESTER' ? (
          <Link
            href="/errands/new"
            className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-lime px-5 text-[13.5px] font-bold text-ink hover:bg-lime-600"
          >
            Post an errand
          </Link>
        ) : null}
      </section>
    </div>
  );
}
