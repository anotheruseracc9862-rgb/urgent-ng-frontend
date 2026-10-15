import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';

const EVENT_QUERY_KEYS: readonly [prefix: string, keys: () => QueryKey[]][] = [
  ['notification.', () => [queryKeys.notifications.all()]],
  ['message.', () => [queryKeys.conversations.all()]],
  ['conversation.', () => [queryKeys.conversations.all()]],
  ['offer.', () => [queryKeys.offers.all(), queryKeys.errands.all(), queryKeys.marketplace.all(), queryKeys.conversations.all()]],
  ['assignment.', () => [queryKeys.assignments.all(), queryKeys.errands.all(), queryKeys.marketplace.all(), queryKeys.conversations.all()]],
  ['errand.', () => [queryKeys.errands.all(), queryKeys.marketplace.all(), queryKeys.assignments.all(), ['dashboard']]],
  ['execution.', () => [queryKeys.assignments.all()]],
  ['change_request.', () => [queryKeys.assignments.all()]],
  ['payment_agreement.', () => [queryKeys.assignments.all()]],
  ['no_show.', () => [queryKeys.assignments.all()]],
  ['problem.', () => [queryKeys.assignments.all()]],
];

export function queryKeysForRealtimeEvent(type: string): QueryKey[] {
  const match = EVENT_QUERY_KEYS.find(([prefix]) => type.startsWith(prefix));
  return match?.[1]() ?? [];
}

export async function invalidateRealtimeEvent(client: QueryClient, type: string): Promise<void> {
  await Promise.all(
    queryKeysForRealtimeEvent(type).map((queryKey) => client.invalidateQueries({ queryKey })),
  );
}
