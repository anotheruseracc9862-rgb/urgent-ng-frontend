import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { queryKeys } from '@/lib/query/keys';
import { listen, server } from '@/test/msw/server';
import { BlockUserButton } from './block-user-button';
import { BlockedPeoplePage } from './blocked-people-page';

const me: Me = {
  id: 'user-blocks-1',
  name: 'Ada Lovelace',
  firstName: 'Ada',
  lastName: 'Lovelace',
  phone: '+2348031234567',
  phoneVerified: true,
  email: null,
  emailVerified: false,
  hasPassword: true,
  googleLinked: false,
  status: 'ACTIVE',
  startMode: 'RUNNER',
  photoMediaId: null,
  bio: null,
  homeArea: null,
  deletionScheduledAt: null,
  createdAt: '2025-03-10T00:00:00.000Z',
};

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-blocks' });
const blocked = {
  userId: 'person-blocked',
  firstName: 'Musa',
  lastInitial: 'I',
  blockedAt: '2026-02-10T12:00:00.000Z',
};

function renderWithProviders(children: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <SessionProvider me={me}>{children}</SessionProvider>
      </QueryClientProvider>,
    ),
  };
}

beforeAll(() => listen());
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());

describe('blocked people', () => {
  it('lists blocked people, unblocks through the API, and shows the empty state', async () => {
    const user = userEvent.setup();
    let people = [blocked];
    let unblockedId: string | undefined;
    server.use(
      http.get('*/api/v1/me/blocks', () => envelope(people)),
      http.delete('*/api/v1/users/:id/block', ({ params }) => {
        unblockedId = String(params.id);
        people = people.filter((person) => person.userId !== unblockedId);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderWithProviders(<BlockedPeoplePage />);

    expect(await screen.findByRole('heading', { name: 'Blocked people' })).toBeInTheDocument();
    expect(await screen.findByText('Musa I.')).toBeInTheDocument();
    expect(screen.getByText(/Blocking does not cancel an errand already in progress/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Unblock' }));

    await waitFor(() => expect(unblockedId).toBe('person-blocked'));
    expect(await screen.findByText('No blocked people')).toBeInTheDocument();
  });

  it('requires confirmation and explains the effects before blocking a person', async () => {
    const user = userEvent.setup();
    let blockId: string | undefined;
    server.use(
      http.post('*/api/v1/users/:id/block', ({ params }) => {
        blockId = String(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { queryClient } = renderWithProviders(<BlockUserButton userId="person-to-block" userName="Musa I." />);
    const conversationKey = queryKeys.conversations.detail('conversation-1');
    queryClient.setQueryData(conversationKey, { id: 'conversation-1' });

    await user.click(screen.getByRole('button', { name: 'Block' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Existing chats become read-only');
    expect(screen.getByRole('dialog')).toHaveTextContent('Blocking does not cancel an errand already in progress');
    expect(blockId).toBeUndefined();

    await user.click(screen.getByRole('button', { name: 'Block person' }));
    await waitFor(() => expect(blockId).toBe('person-to-block'));
    expect(await screen.findByRole('status')).toHaveTextContent('Musa I. was blocked.');
    expect(queryClient.getQueryState(conversationKey)?.isInvalidated).toBe(true);
  });
});
