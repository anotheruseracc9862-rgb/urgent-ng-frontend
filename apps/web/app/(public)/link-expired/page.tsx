import type { Metadata } from 'next';
import { StateCard } from '@/components/public/state-card';

export const metadata: Metadata = {
  title: 'Link expired — Urgent.ng',
  description: 'This link has expired or is no longer valid',
};

export default function LinkExpiredPage() {
  return (
    <StateCard
      title="This link has expired"
      actions={[
        { href: '/login', label: 'Sign in', primary: true },
        { href: '/forgot-password', label: 'Reset password' },
        { href: '/help', label: 'Get help' },
      ]}
    >
      <p>
        Links and codes stop working after a short time, for your safety. Shared tracking links also stop when an
        errand ends.
      </p>
      <ul className="mt-5 grid gap-2 rounded-[var(--r)] bg-panel p-4 text-left text-[13.5px] text-ink-2">
        <li>
          <strong>Password reset?</strong> Ask for a new code from the reset page.
        </li>
        <li>
          <strong>Verification?</strong> Sign in and ask for a new code.
        </li>
        <li>
          <strong>Shared errand?</strong> Ask the requester for a new tracking link.
        </li>
      </ul>
    </StateCard>
  );
}
