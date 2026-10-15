import type { Metadata } from 'next';
import { AssignmentProblemsPage } from '@/features/execution/problems/assignment-problems-page';

export const metadata: Metadata = {
  title: 'Errand Support — Urgent.ng',
};

export default async function AssignmentProblemsRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AssignmentProblemsPage assignmentId={id} />;
}
