import type { Metadata } from 'next';
import { AssignmentRatingPage } from '@/features/ratings/assignment-rating-page';

export const metadata: Metadata = { title: 'Rate your errand — Urgent.ng' };

export default async function AssignmentRatingRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AssignmentRatingPage assignmentId={id} />;
}
