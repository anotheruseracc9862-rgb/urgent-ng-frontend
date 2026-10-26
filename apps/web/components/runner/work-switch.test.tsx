import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { listen, server } from '@/test/msw/server';
import { RunnerWorkSwitch } from './work-switch';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }), usePathname: () => '/offers' }));

const me = { id: 'u1', name: 'Tunde', firstName: 'Tunde', startMode: 'RUNNER' } as unknown as Me;
const summary = (waiting: number) => HttpResponse.json({ data: { asRequester: {}, asRunner: { offersAwaitingYou: waiting }, recentActivity: [] }, meta: {}, requestId: 'r' });

function renderSwitch(current: 'browse' | 'offers') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><SessionProvider me={me}><RunnerWorkSwitch current={current} /></SessionProvider></QueryClientProvider>);
}

beforeAll(() => listen());
afterEach(() => { server.resetHandlers(); cleanup(); });
afterAll(() => server.close());

describe('RunnerWorkSwitch', () => {
  it('links both pages, marks the current one and badges offers awaiting a reply', async () => {
    server.use(http.get('*/me/summary', () => summary(3)));
    renderSwitch('offers');
    expect(screen.getByRole('link', { name: /Browse errands/ })).toHaveAttribute('href', '/marketplace');
    const offers = screen.getByRole('link', { name: /My offers/ });
    expect(offers).toHaveAttribute('href', '/offers');
    expect(offers).toHaveAttribute('aria-current', 'page');
    expect(await screen.findByLabelText('3 awaiting your reply')).toHaveTextContent('3');
  });

  it('shows no badge when nothing is waiting', async () => {
    server.use(http.get('*/me/summary', () => summary(0)));
    renderSwitch('browse');
    await screen.findByRole('link', { name: /My offers/ });
    expect(screen.queryByLabelText(/awaiting your reply/)).not.toBeInTheDocument();
  });
});
