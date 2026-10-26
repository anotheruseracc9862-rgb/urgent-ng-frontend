import type { Metadata } from 'next';
import { RunnerExecutionPage } from '@/features/execution/runner-execution-page';

export const metadata: Metadata = {
  title: 'Continue Errand — Urgent.ng',
};

export default async function RunnerExecutionRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RunnerExecutionPage assignmentId={id} />;
}
