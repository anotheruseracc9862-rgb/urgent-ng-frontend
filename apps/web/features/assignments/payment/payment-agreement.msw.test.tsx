import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { listen, server } from '@/test/msw/server';
import { PaymentAgreementPage } from './payment-agreement-page';

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-payment' });

beforeAll(() => listen());
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

describe('payment agreement', () => {
  it('shows both confirmations cleared after changing the payment method', async () => {
    let agreement = {
      assignmentId: 'payment-assignment',
      agreedAmountMinor: 550000,
      currency: 'NGN',
      paymentMethod: 'CASH',
      paymentTiming: 'AT_DELIVERY',
      confirmedByRequesterAt: '2026-12-31T22:00:00.000Z',
      confirmedByRunnerAt: '2026-12-31T22:05:00.000Z',
      fullyConfirmed: true,
    };
    server.use(
      http.get('*/api/v1/assignments/payment-assignment/payment-agreement', () => envelope(agreement)),
      http.get('*/api/v1/assignments/payment-assignment', () => envelope({
        id: 'payment-assignment',
        errandId: 'errand-1',
        offerId: 'offer-1',
        requesterId: 'requester-1',
        runnerId: 'runner-1',
        status: 'ACCEPTED',
        agreedAmountMinor: 550000,
        currency: 'NGN',
        selectedAt: '2026-12-31T22:00:00.000Z',
        acceptanceDeadline: '2026-12-31T22:30:00.000Z',
        version: 1,
        role: 'RUNNER',
        errand: { id: 'errand-1', title: 'Payment errand' },
      })),
      http.put('*/api/v1/assignments/payment-assignment/payment-agreement', async ({ request }) => {
        expect(await request.json()).toEqual({ paymentMethod: 'BANK_TRANSFER', paymentTiming: 'AT_DELIVERY' });
        agreement = {
          ...agreement,
          paymentMethod: 'BANK_TRANSFER',
          confirmedByRequesterAt: null,
          confirmedByRunnerAt: null,
          fullyConfirmed: false,
        };
        return envelope(agreement);
      }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(<QueryClientProvider client={client}><PaymentAgreementPage assignmentId="payment-assignment" /></QueryClientProvider>);
    const user = userEvent.setup();

    expect(await screen.findByText('Both of you confirmed this plan.')).toBeInTheDocument();
    screen.getByRole('combobox', { name: 'Payment method' }).focus();
    await user.keyboard('{Enter}');
    await user.click(await screen.findByRole('option', { name: 'Bank Transfer' }));
    await user.click(screen.getByRole('button', { name: 'Save payment plan' }));
    expect(await screen.findByText('Waiting for both of you to confirm the current plan.')).toBeInTheDocument();
    expect(screen.getByText('You (Runner)').nextSibling).toHaveTextContent('Not confirmed');
    expect(screen.getByText('Other party').nextSibling).toHaveTextContent('Not confirmed');
    expect(screen.getByText(/Urgent.ng isn't part of it: we don't hold, collect or enforce payment/)).toBeInTheDocument();
  });
});
