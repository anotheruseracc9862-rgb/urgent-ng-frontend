import type { Metadata } from 'next';
import { AssignmentCancellationPage } from '@/features/assignments/cancel/assignment-cancellation-page';

export const metadata: Metadata = {
  title: 'Cancel Assignment — Urgent.ng',
};

export default async function AssignmentCancellationRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AssignmentCancellationPage assignmentId={id} />;
}
