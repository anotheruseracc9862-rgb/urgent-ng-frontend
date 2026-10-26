import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { afterEach, describe, expect, it } from 'vitest';
import { queryKeys } from '@/lib/query/keys';
import { invalidateRealtimeEvent } from '@/features/realtime/event-dispatcher';

let count = 1;

function Bell() {
  const unread = useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: async () => ({ count }),
    staleTime: Infinity,
  });
  return <span data-testid="count">{unread.data?.count ?? '-'}</span>;
}

afterEach(cleanup);

describe('unread count', () => {
  it('refetches without a page refresh when a notification event arrives', async () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <Bell />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));

    count = 2;
    await act(async () => { await invalidateRealtimeEvent(client, 'notification.created'); });
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
  });
});
