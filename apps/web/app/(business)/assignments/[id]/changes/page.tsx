import type { Metadata } from 'next';
import { AssignmentChangesPage } from '@/features/assignments/changes/assignment-changes-page';

export const metadata: Metadata = {
  title: 'Assignment Changes — Urgent.ng',
};

export default async function AssignmentChangesRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AssignmentChangesPage assignmentId={id} />;
}
