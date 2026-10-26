import type { Metadata } from 'next';
import { ActiveTasksPage } from '@/features/assignments/list/active-tasks-page';

export const metadata: Metadata = { title: 'Active task — Urgent.ng' };

export default function AssignmentsRoute() {
  return <ActiveTasksPage />;
}
