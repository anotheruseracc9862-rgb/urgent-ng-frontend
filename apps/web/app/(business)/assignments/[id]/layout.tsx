import { AssignmentJourney } from '@/features/journey/assignment-journey';

/** Every screen of an assignment can show where the errand stands and what happens next. */
export default async function AssignmentLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AssignmentJourney assignmentId={id}>{children}</AssignmentJourney>;
}
