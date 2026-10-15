import type { Metadata } from 'next';
import { AssignmentHubPage } from '@/features/assignments/hub/assignment-hub-page';

export const metadata: Metadata = {
  title: 'Assignment — Urgent.ng',
};

export default async function AssignmentPendingRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AssignmentHubPage assignmentId={id} />;
}
