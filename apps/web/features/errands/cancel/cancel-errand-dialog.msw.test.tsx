import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { listen, server } from '@/test/msw/server';
import { CancelErrandButton } from './cancel-errand-dialog';

const nav = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: nav.replace, refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => '/errands/errand-1',
  useSearchParams: () => new URLSearchParams(),
}));

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-cancel' });

function renderButton(props: Partial<React.ComponentProps<typeof CancelErrandButton>> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><CancelErrandButton errandId="errand-1" status="OPEN" {...props} /></QueryClientProvider>);
}

beforeAll(() => listen());
afterEach(() => { cleanup(); server.resetHandlers(); nav.replace.mockClear(); });
afterAll(() => server.close());

describe('cancelling an errand that is boosted', () => {
  it('says the boost ends and is not refunded, before the person confirms', async () => {
    const user = userEvent.setup();
    renderButton({ boosted: true });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByText("This errand is boosted. Cancelling ends the boost, and it isn't refunded.")).toBeInTheDocument();
  });

  it('says nothing about a boost when there is none, or for a draft', async () => {
    const user = userEvent.setup();
    renderButton();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await screen.findByRole('dialog');
    expect(screen.queryByText(/boosted/i)).toBeNull();
  });
});

describe('cancelling a draft or an open errand in place', () => {
  it('asks once, in a dialog, and sends no reason: there is no page to go to', async () => {
    const user = userEvent.setup();
    let body: unknown;
    server.use(http.post('*/api/v1/errands/errand-1/cancel', async ({ request }) => {
      body = await request.json();
      return envelope({ id: 'errand-1', status: 'CANCELLED' });
    }));
    renderButton();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Cancel this errand?' })).toBeInTheDocument();
    expect(within(dialog).getByText('The errand and its offers will close. No runner has been selected.')).toBeInTheDocument();
    expect(within(dialog).queryByRole('radio')).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Cancel errand' }));
    await waitFor(() => expect(body).toEqual({}));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // The open errand stays in view, now marked cancelled.
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it('says how many offers will close', async () => {
    const user = userEvent.setup();
    renderButton({ offerCount: 3 });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByText(/3 offers on it will close, and those runners are told/)).toBeInTheDocument();
  });

  it('keeping the errand closes the dialog and sends nothing', async () => {
    const user = userEvent.setup();
    let called = false;
    server.use(http.post('*/api/v1/errands/errand-1/cancel', () => { called = true; return envelope({}); }));
    renderButton();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Keep errand' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(called).toBe(false);
  });

  it('deletes a draft the same way, and leaves for the list because there is nothing left to look at', async () => {
    const user = userEvent.setup();
    let body: unknown;
    server.use(http.post('*/api/v1/errands/errand-1/cancel', async ({ request }) => {
      body = await request.json();
      return envelope({ id: 'errand-1', status: 'CANCELLED' });
    }));
    renderButton({ status: 'DRAFT' });

    await user.click(screen.getByRole('button', { name: 'Delete draft' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Delete this draft?' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Delete draft' }));

    await waitFor(() => expect(body).toEqual({}));
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/errands'));
  });

  it('keeps the dialog open and says what went wrong when the server refuses, then lets you try again', async () => {
    const user = userEvent.setup();
    let attempts = 0;
    server.use(http.post('*/api/v1/errands/errand-1/cancel', () => {
      attempts += 1;
      return attempts === 1
        ? HttpResponse.json({ error: { code: 'ERRAND_INVALID_STATE', message: 'x', details: {} }, requestId: 'r' }, { status: 409 })
        : envelope({ id: 'errand-1', status: 'CANCELLED' });
    }));
    renderButton();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel errand' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('The errand changed status before cancellation could finish');

    await user.click(within(dialog).getByRole('button', { name: 'Cancel errand' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(attempts).toBe(2);
  });

  it('shows a plain message when the server itself fails', async () => {
    const user = userEvent.setup();
    server.use(http.post('*/api/v1/errands/errand-1/cancel', () => HttpResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' }, requestId: 'r' }, { status: 500 })));
    renderButton();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel errand' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Something went wrong on our side, and the errand was not cancelled');
  });
});
