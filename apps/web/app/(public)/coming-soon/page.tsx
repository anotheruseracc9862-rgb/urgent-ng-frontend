import type { Metadata } from 'next';
import { StateCard } from '@/components/public/state-card';

export const metadata: Metadata = {
  title: 'Coming soon — Urgent.ng',
  description: 'Urgent.ng errands are launching soon.',
  robots: { index: false },
};

/** Shown in place of every signed-in area while only the public and account pages are live. */
export default function ComingSoonPage() {
  return (
    <StateCard
      title="Coming soon"
      actions={[
        { href: '/', label: 'Back to home', primary: true },
        { href: '/help', label: 'Get help' },
      ]}
    >
      <p>We are getting Urgent.ng ready. Posting errands, offers and tracking will open soon.</p>
      <p className="mt-3">Your account is safe. Come back soon and sign in to start.</p>
    </StateCard>
  );
}
