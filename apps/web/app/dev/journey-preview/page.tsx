import { notFound } from 'next/navigation';
import { JourneyPanel } from '@/features/journey/journey-panel';
import { buildJourney, type JourneyFacts } from '@/features/journey/journey';

export const metadata = { title: 'Journey bar preview — Urgent.ng' };
export const dynamic = 'force-dynamic';

const ids = { errandId: 'e1', offerId: 'o1', assignmentId: 'a1' };
const deadline = new Date(Date.now() + 21 * 60_000).toISOString();

const samples: Array<{ title: string; facts: JourneyFacts }> = [
  { title: 'Requester: waiting for offers', facts: { role: 'REQUESTER', errandStatus: 'OPEN', ids } },
  { title: 'Runner: negotiating, your turn', facts: { role: 'RUNNER', offer: { status: 'ACTIVE', awaitingParty: 'RUNNER', needsReconfirmation: false }, ids } },
  { title: 'Requester: terms agreed, select', facts: { role: 'REQUESTER', offer: { status: 'ACTIVE', awaitingParty: 'NONE', needsReconfirmation: false }, ids } },
  { title: 'Runner: you were selected', facts: { role: 'RUNNER', errandStatus: 'RUNNER_SELECTED', assignment: { status: 'PENDING_ACCEPTANCE', acceptanceDeadline: deadline }, ids } },
  { title: 'Requester: payment terms, runner confirmed first', facts: { role: 'REQUESTER', errandStatus: 'ACCEPTED', assignment: { status: 'ACCEPTED' }, payment: { confirmedByRequester: false, confirmedByRunner: true, fullyConfirmed: false }, ids } },
  { title: 'Runner: on the errand', facts: { role: 'RUNNER', errandStatus: 'PICKED_UP', assignment: { status: 'ACCEPTED' }, ids } },
  { title: 'Requester: confirm delivery', facts: { role: 'REQUESTER', errandStatus: 'DELIVERED', assignment: { status: 'ACCEPTED' }, ids } },
  { title: 'Runner: assignment timed out', facts: { role: 'RUNNER', assignment: { status: 'TIMED_OUT' }, ids } },
];

export default function JourneyPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <main className="mx-auto grid max-w-5xl gap-6 p-4 sm:p-8">
      <h1 className="text-2xl font-extrabold text-ink">Journey bar</h1>
      {samples.map(({ title, facts }) => (
        <div key={title}>
          <h2 className="mb-2 text-sm font-extrabold text-muted">{title}</h2>
          <JourneyPanel view={buildJourney(facts)} otherRole={facts.role === 'RUNNER' ? 'requester' : 'runner'} />
        </div>
      ))}
    </main>
  );
}
