import { queryOptions } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { liveQuery } from '@/lib/query/persisted-query';

export type RunnerTask = components['schemas']['RunnerAssignmentSummaryDto'];
export type RunnerTaskStatus = 'ACTIVE' | 'PENDING_ACCEPTANCE';

export const assignmentQueries = {
  /** The runner's tasks by status. Assignments are never written to storage. */
  runnerTasks: (userId: string, status: RunnerTaskStatus, limit = 20) =>
    queryOptions({
      queryKey: [...queryKeys.assignments.runnerTasks(userId, status), limit] as const,
      queryFn: ({ signal }) => api<RunnerTask[]>('/runner/assignments', { query: { status, limit }, signal }),
      ...liveQuery('live'),
    }),
};
