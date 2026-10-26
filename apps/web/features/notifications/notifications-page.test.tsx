import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { listen, server } from '@/test/msw/server';
import { NotificationsPage } from './notifications-page';

beforeAll(() => listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('combines category and unread filters, and All restores read and unread notifications', async () => {
  const notes = [
    { id: 'offer', category: 'TRANSACTIONAL', type: 'offer.new', title: 'New offer', body: 'A runner has offered to help.', readAt: null },
    { id: 'message', category: 'MESSAGING', type: 'message.new', title: 'Runner message', body: 'I have arrived.', readAt: '2026-10-15T10:00:00Z' },
  ].map((note) => ({ ...note, data: {}, createdAt: '2026-10-15T09:00:00Z' }));

  server.use(
    http.get('*/notifications/unread-count', () => HttpResponse.json({ data: { count: 27 } })),
    http.get('*/notifications', ({ request }) => {
      const query = new URL(request.url).searchParams;
      return HttpResponse.json({ data: notes.filter((note) =>
        (!query.has('category') || note.category === query.get('category')) &&
        (!query.has('unread') || note.readAt === null),
      ) });
    }),
  );

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><NotificationsPage /></QueryClientProvider>);
  await screen.findByRole('button', { name: /^Unread: New offer/ });
  // The badge is the server's full unread count, not the number on the loaded page.
  expect(await screen.findByText('27')).toBeVisible();

  fireEvent.click(screen.getByRole('button', { name: 'Messages', exact: true }));
  expect(await screen.findByRole('button', { name: /^Runner message/ })).toBeVisible();
  expect(screen.queryByRole('button', { name: /^Unread: New offer/ })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('checkbox', { name: 'Unread only' }));
  expect(await screen.findByText('No unread notifications match your filters.')).toBeVisible();

  fireEvent.click(screen.getByRole('button', { name: 'All', exact: true }));
  expect(screen.getByRole('checkbox', { name: 'Unread only' })).not.toBeChecked();
  expect(await screen.findByRole('button', { name: /^Unread: New offer/ })).toBeVisible();
  expect(await screen.findByRole('button', { name: /^Runner message/ })).toBeVisible();
  expect(screen.getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'true');
  client.clear();
});

it('loads Offers and Progress from the server and keeps the topic on subsequent pages', async () => {
  const note = (id: string, type: string, title: string) => ({
    id, type, title, body: 'Update details', category: 'MARKETPLACE', data: {},
    createdAt: '2026-10-15T09:00:00Z', readAt: null,
  });
  server.use(
    http.get('*/notifications/unread-count', () => HttpResponse.json({ data: { count: 3 } })),
    http.get('*/notifications', ({ request }) => {
      const query = new URL(request.url).searchParams;
      if (query.has('category')) return new HttpResponse(null, { status: 400 });
      if (query.get('topic') === 'OFFERS') {
        return query.has('cursor')
          ? HttpResponse.json({ data: [note('counter', 'offer.countered', 'Counter received')] })
          : HttpResponse.json({ data: [note('offer', 'offer.new', 'Fresh offer')], meta: { nextCursor: 'offers-page-2' } });
      }
      if (query.get('topic') === 'PROGRESS') {
        return HttpResponse.json({ data: [note('receipt', 'execution.receipt_added', 'Receipt added')] });
      }
      return HttpResponse.json({ data: [note('nearby', 'errand.nearby', 'Nearby discovery')] });
    }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><NotificationsPage /></QueryClientProvider>);
  await screen.findByRole('button', { name: /^Unread: Nearby discovery/ });
  fireEvent.click(screen.getByRole('button', { name: 'Offers', exact: true }));
  expect(await screen.findByRole('button', { name: /^Unread: Fresh offer/ })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
  expect(await screen.findByRole('button', { name: /^Unread: Counter received/ })).toBeVisible();
  expect(screen.queryByRole('button', { name: /^Unread: Nearby discovery/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Progress', exact: true }));
  expect(await screen.findByRole('button', { name: /^Unread: Receipt added/ })).toBeVisible();
  expect(screen.queryByRole('button', { name: /^Unread: Fresh offer/ })).not.toBeInTheDocument();
  client.clear();
});
