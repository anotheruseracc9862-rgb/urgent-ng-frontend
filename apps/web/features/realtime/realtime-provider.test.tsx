import { act, cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSessionCaches } from '@/lib/auth/session-events';
import { queryKeys } from '@/lib/query/keys';
import { queryKeysForRealtimeEvent } from './event-dispatcher';
import { RealtimeProvider, useRealtimeStatus } from './realtime-provider';

const apiMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', () => ({ api: apiMock }));

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;
  private listeners = new Map<string, Array<(event: Event) => void>>();

  constructor(public url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(name: string, handler: (event: Event) => void) {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), handler]);
  }

  close() {
    this.closed = true;
  }

  open() {
    this.onopen?.();
  }

  emit(data: unknown, lastEventId = '') {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data), lastEventId }));
  }

  emitNamed(name: string, data: unknown) {
    const event = new MessageEvent(name, { data: JSON.stringify(data) });
    this.listeners.get(name)?.forEach((handler) => handler(event));
  }

  fail() {
    this.onerror?.();
  }
}

function Status() {
  return <p data-testid="status">{useRealtimeStatus()}</p>;
}

function setup() {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  render(
    <QueryClientProvider client={client}>
      <RealtimeProvider userId="user-1">
        <Status />
      </RealtimeProvider>
    </QueryClientProvider>,
  );
  return { invalidate };
}

const flush = () => act(async () => { for (let i = 0; i < 5; i += 1) await Promise.resolve(); });

beforeEach(() => {
  vi.useFakeTimers();
  FakeEventSource.instances = [];
  vi.stubGlobal('EventSource', FakeEventSource);
  apiMock.mockReset().mockResolvedValue({ ticket: 'tkt-1', expiresInSeconds: 60 });
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('event dispatcher', () => {
  it('maps event types to query keys and ignores unknown types', () => {
    expect(queryKeysForRealtimeEvent('notification.created')).toEqual([queryKeys.notifications.all()]);
    // A message also moves the unread notification count.
    expect(queryKeysForRealtimeEvent('message.created')).toEqual([queryKeys.conversations.all(), queryKeys.notifications.all()]);
    expect(queryKeysForRealtimeEvent('offer.new')).toContainEqual(queryKeys.offers.all());
    expect(queryKeysForRealtimeEvent('offer.new')).toContainEqual(queryKeys.errands.all());
    expect(queryKeysForRealtimeEvent('something.else')).toEqual([]);
  });
});

describe('RealtimeProvider', () => {
  it('goes live on open and invalidates mapped queries on an event', async () => {
    const { invalidate } = setup();
    await flush();
    const source = FakeEventSource.instances[0]!;
    expect(source.url).toBe('/api/v1/events?ticket=tkt-1');
    act(() => source.open());
    expect(screen.getByTestId('status').textContent).toBe('live');

    act(() => source.emit({ type: 'notification.created' }, '1-0'));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.notifications.all() });
  });

  it('drops a duplicate event id', async () => {
    const { invalidate } = setup();
    await flush();
    const source = FakeEventSource.instances[0]!;
    act(() => source.open());
    act(() => source.emit({ id: 'e1', type: 'notification.created' }));
    act(() => source.emit({ id: 'e1', type: 'notification.created' }));
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it('refetches everything on resync', async () => {
    const { invalidate } = setup();
    await flush();
    const source = FakeEventSource.instances[0]!;
    act(() => source.open());
    act(() => source.emitNamed('resync', { type: 'resync' }));
    expect(invalidate).toHaveBeenCalledWith();
  });

  it('falls back to polling and reconnects with a ticket and Last-Event-ID after the stream dies', async () => {
    const { invalidate } = setup();
    await flush();
    const first = FakeEventSource.instances[0]!;
    act(() => first.open());
    act(() => first.emit({ id: '7-0', type: 'notification.created' }));

    act(() => first.fail());
    expect(first.closed).toBe(true);
    expect(screen.getByTestId('status').textContent).toBe('degraded');

    invalidate.mockClear();
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(invalidate).toHaveBeenCalledWith();

    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(apiMock).toHaveBeenCalledWith('/events/ticket', { method: 'POST', body: {} });
    const second = FakeEventSource.instances[1]!;
    expect(second.url).toContain('ticket=tkt-1');
    expect(second.url).toContain('lastEventId=7-0');

    act(() => second.open());
    expect(screen.getByTestId('status').textContent).toBe('live');
  });

  it('closes the stream when the session is cleared', async () => {
    setup();
    await flush();
    const source = FakeEventSource.instances[0]!;
    act(() => source.open());
    act(() => clearSessionCaches());
    expect(source.closed).toBe(true);
    expect(screen.getByTestId('status').textContent).toBe('offline');
  });

  it('shows offline when the browser goes offline and reconnects when it returns', async () => {
    setup();
    await flush();
    const source = FakeEventSource.instances[0]!;
    act(() => source.open());

    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(source.closed).toBe(true);
    expect(screen.getByTestId('status').textContent).toBe('offline');

    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    await act(async () => { window.dispatchEvent(new Event('online')); await Promise.resolve(); });
    expect(FakeEventSource.instances.length).toBe(2);
  });
});
