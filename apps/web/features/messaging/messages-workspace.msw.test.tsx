import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { listen, server } from '@/test/msw/server';
import { MessagesWorkspace } from './messages-workspace';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/messages',
}));
vi.mock('@/components/media/MediaUpload', () => ({ MediaUpload: () => null }));

const me = { id: 'u1', name: 'Ada', firstName: 'Ada', startMode: 'REQUESTER' } as unknown as Me;
const envelope = (data: unknown, meta: unknown = {}) => HttpResponse.json({ data, meta, requestId: 'req-msgs' });

const tunde = {
  id: 'c1', errandId: 'e1', errandTitle: 'Collect fabric samples', muted: false, canSend: true, readOnlyReason: null,
  unreadCount: 2, lastMessageAt: new Date(Date.now() - 4 * 60_000).toISOString(), createdAt: '2026-10-15T08:00:00Z',
  counterpart: { userId: 'u2', firstName: 'Tunde', lastName: 'Okon', photoMediaId: null, role: 'RUNNER', rating: 4.9, ratingCount: 30 },
  lastMessagePreview: 'Found her. Parcel is wrapped.', errandStatus: 'IN_PROGRESS', amountMinor: 300_000, amountKind: 'AGREED',
  pickupArea: 'Balogun', destinationArea: 'Lekki Phase 1', assignmentId: 'a1',
};
const emeka = {
  ...tunde, id: 'c2', errandId: 'e2', errandTitle: 'Inspect used car engine', unreadCount: 0,
  counterpart: { userId: 'u3', firstName: 'Emeka', lastName: 'Nwosu', photoMediaId: null, role: 'RUNNER', rating: null, ratingCount: 0 },
  lastMessagePreview: 'Could you do ₦7,000?', errandStatus: 'OPEN', amountMinor: 800_000, amountKind: 'OFFER', assignmentId: null,
};

function renderWorkspace(activeId?: string) {
  server.use(
    http.get('*/conversations', ({ request }) => {
      const filter = new URL(request.url).searchParams.get('filter');
      return envelope(filter === 'CLOSED' ? [emeka] : [tunde, emeka]);
    }),
    http.get('*/conversations/c1', () => envelope(tunde)),
    http.get('*/conversations/c2', () => envelope(emeka)),
    http.get('*/conversations/c1/messages', () => envelope([
      { id: 'm1', conversationId: 'c1', senderId: 'u2', type: 'TEXT', body: 'Found her.', status: 'SENT', createdAt: '2026-10-15T08:00:00Z' },
      { id: 'm0', conversationId: 'c1', senderId: 'u2', type: 'SYSTEM', body: 'Tunde accepted. Terms confirmed.', status: 'SENT', createdAt: '2026-10-15T07:00:00Z' },
    ])),
    http.post('*/conversations/c1/read', () => envelope({ marked: 1 })),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SessionProvider me={me}><MessagesWorkspace activeId={activeId} /></SessionProvider>
    </QueryClientProvider>,
  );
}

beforeAll(() => listen());
afterEach(() => { server.resetHandlers(); cleanup(); });
afterAll(() => server.close());

describe('Messages workspace', () => {
  it('lists conversations with errand, preview, time and unread, and a total badge', async () => {
    renderWorkspace();
    const list = await screen.findByRole('region', { name: 'Conversations' });
    expect(await within(list).findByText('Tunde O.')).toBeInTheDocument();
    expect(within(list).getByText('Collect fabric samples')).toBeInTheDocument();
    expect(within(list).getByText('Found her. Parcel is wrapped.')).toBeInTheDocument();
    expect(within(list).getByText('2 unread')).toBeInTheDocument();
    expect(within(list).getByRole('link', { name: /Tunde O\./ })).toHaveAttribute('href', '/messages/c1');
    expect(screen.getByText('Select a conversation')).toBeInTheDocument();
  });

  it('filters with the demo tabs', async () => {
    renderWorkspace();
    expect(await screen.findByText('Tunde O.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Offers' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Closed' }));
    expect(await screen.findByText('Emeka N.')).toBeInTheDocument();
    expect(screen.queryByText('Tunde O.')).toBeNull();
    expect(screen.getByText('All read')).toBeInTheDocument();
  });

  it('opens a conversation with the runner subtitle, errand ribbon and details', async () => {
    renderWorkspace('c1');
    expect(await screen.findByRole('heading', { name: 'Tunde O.' })).toBeInTheDocument();
    expect(screen.getByText('★ 4.9 · Verified runner')).toBeInTheDocument();
    expect(await screen.findByText('Found her.')).toBeInTheDocument();
    expect(screen.getByText('Tunde accepted. Terms confirmed.')).toBeInTheDocument();

    const details = screen.getByRole('complementary', { name: 'Errand details' });
    expect(await within(details).findByText('Agreed amount')).toBeInTheDocument();
    expect(within(details).getByText('₦3,000')).toBeInTheDocument();
    expect(within(details).getByRole('link', { name: 'Open errand' })).toHaveAttribute('href', '/errands/e1');
    expect(within(details).getByRole('link', { name: 'Payment terms' })).toHaveAttribute('href', '/assignments/a1/payment');
    expect(within(details).getByRole('link', { name: 'Report' })).toHaveAttribute('href', '/report?targetType=USER&targetId=u2');
    expect(within(details).getByRole('button', { name: 'Mute conversation' })).toBeInTheDocument();
    expect(within(details).getByRole('button', { name: 'Block Tunde' })).toBeInTheDocument();
  });

  it('shows an offer as an offer, with no payment terms before selection', async () => {
    renderWorkspace('c2');
    const details = await screen.findByRole('complementary', { name: 'Errand details' });
    expect(await within(details).findByText('Offer')).toBeInTheDocument();
    expect(within(details).getByText('₦8,000')).toBeInTheDocument();
    expect(within(details).queryByRole('link', { name: 'Payment terms' })).toBeNull();
  });
});
