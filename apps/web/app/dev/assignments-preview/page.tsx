import { notFound } from 'next/navigation';
import { TaskRow } from '@/features/assignments/list/active-tasks-page';
import type { RunnerTask } from '@/features/assignments/queries';

export const metadata = { title: 'Active tasks preview — Urgent.ng' };
export const dynamic = 'force-dynamic';

const base: RunnerTask = {
  id: 'a1',
  errandId: 'e1',
  status: 'ACCEPTED',
  errandStatus: 'PICKED_UP',
  errandTitle: 'Collect fabric samples from Balogun market',
  agreedAmountMinor: 300000,
  acceptanceDeadline: new Date(Date.now() + 20 * 60_000).toISOString(),
  acceptedAt: null,
  pickupArea: 'Balogun Island, Lagos Island',
  destinationArea: 'Fashion Studio, Lekki Phase 1',
  categoryFlow: 'TRANSIT',
  selectedAt: new Date().toISOString(),
  requesterFirstName: 'Emmanuella',
  conversationId: 'c1',
};

export default function AssignmentsPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <main className="mx-auto grid max-w-3xl gap-6 p-4 sm:p-8">
      <h1 className="text-2xl font-extrabold text-ink">Active task cards</h1>
      <ul className="grid gap-3">
        <TaskRow assignment={{ ...base, status: 'PENDING_ACCEPTANCE', errandStatus: 'RUNNER_SELECTED' }} respond />
        <TaskRow assignment={base} />
        <TaskRow assignment={{ ...base, errandStatus: 'PICKED_UP', categoryFlow: 'SERVICE', pickupArea: null, destinationArea: 'Admiralty Way, Lekki Phase 1', errandTitle: 'Deep clean my two-bedroom flat', agreedAmountMinor: 600000 }} />
        <TaskRow assignment={{ ...base, errandStatus: 'DELIVERED', errandTitle: 'Pick up dry-cleaned agbada and lace attire', agreedAmountMinor: 400000, conversationId: null }} />
      </ul>
    </main>
  );
}
