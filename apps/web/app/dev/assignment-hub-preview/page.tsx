import { notFound } from 'next/navigation';
import { HubPreview } from './preview';

export const metadata = { title: 'Assignment page preview — Urgent.ng' };
export const dynamic = 'force-dynamic';

export default async function AssignmentHubPreviewPage({ searchParams }: { searchParams: Promise<{ state?: string; screen?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { state, screen } = await searchParams;
  const pending = state === 'pending';
  return (
    <div className="grid min-h-screen gap-4 p-3 sm:p-4 lg:grid-cols-[276px_minmax(0,1fr)]">
      <div className="hidden rounded-[var(--r-xl)] bg-surface shadow-[var(--shadow)] lg:block" aria-hidden="true" />
      <main className="min-w-0 pb-24 lg:pb-10"><HubPreview screen={screen === 'run' ? 'run' : 'hub'} status={pending ? 'PENDING_ACCEPTANCE' : 'ACCEPTED'} errandStatus={pending ? 'RUNNER_SELECTED' : 'IN_PROGRESS'} /></main>
    </div>
  );
}
