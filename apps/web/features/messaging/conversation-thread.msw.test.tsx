import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { listen, server } from '@/test/msw/server';
import { ConversationThreadPage } from './conversation-thread-page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/messages/c1',
}));
vi.mock('@/components/media/MediaUpload', () => ({ MediaUpload: () => null }));
vi.mock('@/features/blocks/block-user-button', () => ({ BlockUserButton: () => <button type="button">Block</button> }));

const me = { id: 'user-1', firstName: 'Ada', name: 'Ada L', status: 'ACTIVE' } as unknown as Me;
const envelope = (data: unknown, meta: unknown = {}) => HttpResponse.json({ data, meta, requestId: 'req-chat' });

const conversation = {
  id: 'c1', errandId: 'e1', errandTitle: 'Pick up parcel', muted: false, canSend: true,
  readOnlyReason: null, unreadCount: 0, lastMessageAt: null, createdAt: '2026-10-15T08:00:00Z',
  counterpart: { userId: 'user-2', firstName: 'Tobi', lastName: 'Ade', photoMediaId: null, role: 'RUNNER', rating: 4.9, ratingCount: 12 },
  lastMessagePreview: 'On my way', errandStatus: 'IN_PROGRESS', amountMinor: 300_000, amountKind: 'AGREED', pickupArea: 'Yaba', destinationArea: 'Ikeja', assignmentId: 'a1',
};

function renderThread() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SessionProvider me={me}>
        <ConversationThreadPage conversationId="c1" />
      </SessionProvider>
    </QueryClientProvider>,
  );
}

beforeAll(() => listen());
afterEach(() => { server.resetHandlers(); cleanup(); });
afterAll(() => server.close());

describe('ConversationThreadPage', () => {
  it('reuses the clientMessageId when a failed send is retried', async () => {
    const ids: string[] = [];
    let attempt = 0;
    server.use(
      http.get('*/conversations/c1', () => envelope(conversation)),
      http.get('*/conversations/c1/messages', () => envelope([])),
      http.post('*/conversations/c1/read', () => envelope({ marked: 0 })),
      http.post('*/conversations/c1/messages', async ({ request }) => {
        const body = (await request.json()) as { clientMessageId: string };
        ids.push(body.clientMessageId);
        attempt += 1;
        if (attempt === 1) return HttpResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'x' }, requestId: 'r' }, { status: 500 });
        return envelope({ id: 'm1', conversationId: 'c1', senderId: 'user-1', type: 'TEXT', body: 'Hello', status: 'SENT', createdAt: '2026-10-15T08:01:00Z' });
      }),
    );
    renderThread();
    const box = await screen.findByLabelText(/^Message/);
    fireEvent.change(box, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Retry message' }));
    await waitFor(() => expect(ids).toHaveLength(2));
    expect(ids[1]).toBe(ids[0]);
  });

  it('says why a closed conversation is read-only', async () => {
    server.use(
      http.get('*/conversations/c1', () => envelope({ ...conversation, canSend: false, readOnlyReason: 'ERRAND_ENDED' })),
      http.get('*/conversations/c1/messages', () => envelope([])),
    );
    renderThread();
    expect(await screen.findByText(/This errand ended, so the conversation is read-only/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Send' })).toBeNull();
  });

  it('shows not found for a conversation the user is not part of', async () => {
    server.use(
      http.get('*/conversations/c1', () => HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'x' }, requestId: 'r' }, { status: 404 })),
    );
    renderThread();
    expect(await screen.findByText('This conversation was not found.')).toBeTruthy();
  });

  it('shows a deleted message as a tombstone', async () => {
    server.use(
      http.get('*/conversations/c1', () => envelope(conversation)),
      http.get('*/conversations/c1/messages', () => envelope([
        { id: 'm1', conversationId: 'c1', senderId: 'user-2', type: 'TEXT', body: '', status: 'REMOVED', createdAt: '2026-10-15T08:01:00Z' },
      ])),
      http.post('*/conversations/c1/read', () => envelope({ marked: 1 })),
    );
    renderThread();
    expect(await screen.findByText('This message was removed.')).toBeTruthy();
  });
});
