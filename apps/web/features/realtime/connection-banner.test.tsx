import { act, cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectionBanner } from './connection-banner';
import { RealtimeProvider } from './realtime-provider';

vi.mock('@/lib/api/client', () => ({ api: vi.fn().mockResolvedValue({ ticket: 't', expiresInSeconds: 60 }) }));

class FakeEventSource {
  static last: FakeEventSource;
  onopen: (() => void) | null = null;
  onmessage = null;
  onerror: (() => void) | null = null;
  constructor() { FakeEventSource.last = this; }
  addEventListener() {}
  close() {}
}

const flush = () => act(async () => { for (let i = 0; i < 5; i += 1) await Promise.resolve(); });

const setOnline = (value: boolean) =>
  Object.defineProperty(navigator, 'onLine', { value, configurable: true });

beforeEach(() => {
  vi.stubGlobal('EventSource', FakeEventSource);
  setOnline(true);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('ConnectionBanner', () => {
  it('shows offline, then back online and refetches when the connection returns', async () => {
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    render(
      <QueryClientProvider client={client}>
        <RealtimeProvider userId="u1"><ConnectionBanner /></RealtimeProvider>
      </QueryClientProvider>,
    );
    await flush();
    act(() => FakeEventSource.last.onopen?.());
    expect(screen.queryByRole('status')).toBeNull();

    setOnline(false);
    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(screen.getByRole('status').textContent).toMatch(/offline/i);

    setOnline(true);
    act(() => { window.dispatchEvent(new Event('online')); });
    await flush();
    invalidate.mockClear();
    act(() => FakeEventSource.last.onopen?.());
    expect(screen.getByRole('status').textContent).toMatch(/back online/i);
    expect(invalidate).toHaveBeenCalled();
  });
});
