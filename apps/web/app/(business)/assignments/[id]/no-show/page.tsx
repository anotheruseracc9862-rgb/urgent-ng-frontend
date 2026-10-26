import type { Metadata } from 'next';
import { NoShowPage } from '@/features/safety/no-show/no-show-page';

export const metadata: Metadata = {
  title: 'No-show Report — Urgent.ng',
};

export default async function AssignmentNoShowRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NoShowPage assignmentId={id} />;
}
