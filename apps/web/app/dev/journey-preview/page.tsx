import { notFound } from 'next/navigation';
import { JourneyPanel } from '@/features/journey/journey-panel';
import { buildJourney, type JourneyFacts } from '@/features/journey/journey';

export const metadata = { title: 'Journey steps preview — Urgent.ng' };
export const dynamic = 'force-dynamic';

const samples: Array<{ title: string; facts: JourneyFacts }> = [
  { title: 'Requester: waiting for offers', facts: { role: 'REQUESTER', errandStatus: 'OPEN' } },
  { title: 'Runner: negotiating', facts: { role: 'RUNNER', offer: { status: 'ACTIVE' } } },
  { title: 'Runner: you were selected', facts: { role: 'RUNNER', errandStatus: 'RUNNER_SELECTED', assignment: { status: 'PENDING_ACCEPTANCE' } } },
  { title: 'Requester: payment terms', facts: { role: 'REQUESTER', errandStatus: 'ACCEPTED', assignment: { status: 'ACCEPTED' }, payment: { fullyConfirmed: false } } },
  { title: 'Runner: on the errand', facts: { role: 'RUNNER', errandStatus: 'PICKED_UP', assignment: { status: 'ACCEPTED' } } },
  { title: 'Requester: confirm delivery', facts: { role: 'REQUESTER', errandStatus: 'DELIVERED', assignment: { status: 'ACCEPTED' } } },
  { title: 'Runner: completed', facts: { role: 'RUNNER', errandStatus: 'COMPLETED', assignment: { status: 'COMPLETED' } } },
  { title: 'Runner: assignment timed out', facts: { role: 'RUNNER', assignment: { status: 'TIMED_OUT' } } },
];

export default function JourneyPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <main className="mx-auto grid max-w-4xl gap-5 p-4 sm:p-8">
      <h1 className="text-2xl font-extrabold text-ink">Journey steps</h1>
      {samples.map(({ title, facts }) => (
        <div key={title}>
          <h2 className="mb-2 text-sm font-extrabold text-muted">{title}</h2>
          <JourneyPanel view={buildJourney(facts)} />
        </div>
      ))}
    </main>
  );
}
