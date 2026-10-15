import type { Metadata } from 'next';
import { AssignmentCompletionPage } from '@/features/assignments/complete/assignment-completion-page';

export const metadata: Metadata = {
  title: 'Confirm Delivery — Urgent.ng',
};

export default async function AssignmentCompletionRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AssignmentCompletionPage assignmentId={id} />;
}
