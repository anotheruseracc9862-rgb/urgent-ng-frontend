import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams('redirect=%2Fdashboard'),
}));

const refresh = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, refreshBrowserSession: refresh, clearBrowserSession: vi.fn() };
});

import SessionPage from './page';

const fetchMock = vi.fn();

beforeEach(() => {
  replace.mockReset();
  refresh.mockReset();
  fetchMock.mockReset().mockResolvedValue(new Response('{}', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('/session', () => {
  it('returns to the requested page after a successful refresh', async () => {
    refresh.mockResolvedValue('refreshed');
    render(<SessionPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('expires the browser cookies through logout before going to /login when the refresh is refused', async () => {
    refresh.mockResolvedValue('expired');
    render(<SessionPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login?reason=session-expired&redirect=%2Fdashboard'));
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/logout', expect.objectContaining({ method: 'POST' }));
  });
});
