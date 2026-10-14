import type { Metadata } from 'next';
import { AssignmentPendingPage } from '@/features/offers/assignment/assignment-pending-page';

export const metadata: Metadata = {
  title: 'Assignment Pending — Urgent.ng',
};

export default async function AssignmentPendingRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AssignmentPendingPage assignmentId={id} />;
}
