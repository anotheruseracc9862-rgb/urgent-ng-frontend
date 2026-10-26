import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { listen, server } from '@/test/msw/server';
import { RealtimeProvider } from './realtime-provider';

class FakeEventSource {
  static last: FakeEventSource;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public url: string) { FakeEventSource.last = this; }
  addEventListener() {}
  close() {}
  push(type: string, id: string) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify({ type, data: {} }), lastEventId: id }));
  }
}

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'rt' });

let offers = ['Offer A'];
let messages = ['Hi'];
let status = 'OPEN';

function Screen() {
  const offerList = useQuery({
    queryKey: queryKeys.offers.list({ errandId: 'e1' }),
    queryFn: () => api<string[]>('/test/offers'),
  });
  const thread = useQuery({
    queryKey: queryKeys.conversations.messages('c1'),
    queryFn: () => api<string[]>('/test/messages'),
  });
  const errand = useQuery({
    queryKey: queryKeys.errands.detail('e1'),
    queryFn: () => api<{ status: string }>('/test/errand'),
  });
  return (
    <div>
      <p data-testid="offers">{offerList.data?.join(',')}</p>
      <p data-testid="messages">{thread.data?.join(',')}</p>
      <p data-testid="status">{errand.data?.status}</p>
    </div>
  );
}

beforeAll(() => listen());
beforeEach(() => {
  offers = ['Offer A'];
  messages = ['Hi'];
  status = 'OPEN';
  vi.stubGlobal('EventSource', FakeEventSource);
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  server.use(
    http.get('*/test/offers', () => envelope(offers)),
    http.get('*/test/messages', () => envelope(messages)),
    http.get('*/test/errand', () => envelope({ status })),
  );
});
afterEach(() => { server.resetHandlers(); cleanup(); vi.unstubAllGlobals(); });
afterAll(() => server.close());

async function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  render(
    <QueryClientProvider client={client}>
      <RealtimeProvider userId="u1"><Screen /></RealtimeProvider>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('offers').textContent).toBe('Offer A'));
  await waitFor(() => expect(FakeEventSource.last).toBeDefined());
  act(() => FakeEventSource.last.onopen?.());
}

describe('realtime end to end (simulated stream)', () => {
  it('shows a new offer without a manual refetch', async () => {
    await mount();
    offers = ['Offer A', 'Offer B'];
    act(() => FakeEventSource.last.push('offer.new', '1-0'));
    await waitFor(() => expect(screen.getByTestId('offers').textContent).toBe('Offer A,Offer B'));
  });

  it('shows a new message when a message event arrives', async () => {
    await mount();
    messages = ['Hi', 'On my way'];
    act(() => FakeEventSource.last.push('message.new', '2-0'));
    await waitFor(() => expect(screen.getByTestId('messages').textContent).toBe('Hi,On my way'));
  });

  it('shows a status change when an errand event arrives', async () => {
    await mount();
    status = 'ASSIGNED';
    act(() => FakeEventSource.last.push('assignment.accepted', '3-0'));
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('ASSIGNED'));
  });
});
