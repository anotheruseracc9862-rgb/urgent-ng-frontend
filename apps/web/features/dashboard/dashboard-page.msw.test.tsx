import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { listen, server } from '@/test/msw/server';
import { DashboardPage } from './dashboard-page';

const me: Me = {
  id: 'user-1',
  name: 'Ada Lovelace',
  firstName: 'Ada',
  lastName: 'Lovelace',
  phone: '+2348031234567',
  phoneVerified: true,
  email: null,
  emailVerified: false,
  status: 'ACTIVE',
  startMode: 'REQUESTER',
  photoMediaId: null,
  bio: null,
  homeArea: null,
  deletionScheduledAt: null,
  createdAt: '2025-03-10T00:00:00.000Z',
};

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-dashboard' });

function renderDashboard(mode: 'REQUESTER' | 'RUNNER') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <SessionProvider me={me}>
        <DashboardPage mode={mode} firstName="Ada" />
      </SessionProvider>
    </QueryClientProvider>,
  );
}

const summary = {
  asRequester: {
    errandsThisMonth: 3,
    completedThisMonth: 1,
    openErrands: 1,
    activeErrands: 0,
    successRate: 1,
    errandsWithOffers: 1,
    offersToReview: 2,
    awaitingRunnerAcceptance: 0,
    deliveriesToConfirm: 0,
    changeRequestsToAnswer: 0,
  },
  asRunner: {
    activeAssignments: 0,
    selectedAwaitingYou: 1,
    activeOffers: 1,
    offersAwaitingYou: 1,
    offersThisWeek: 4,
    completedLast30Days: 2,
    changeRequestsToAnswer: 0,
  },
  recentActivity: [],
};

beforeAll(() => listen());
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());

describe('business dashboard', () => {
  it('shows requester counts, attention items, and API-backed errands', async () => {
    server.use(
      http.get('*/api/v1/me/summary', () => envelope(summary)),
      http.get('*/api/v1/errands/mine', ({ request }) => {
        const url = new URL(request.url);
        return envelope(url.searchParams.get('tab') === 'OPEN' ? [{
          id: 'errand-1',
          title: 'Collect a package',
          status: 'OPEN',
          category: { id: 'cat-1', name: 'Pickup' },
          priority: 'NORMAL',
          timeMode: null,
          scheduledAt: null,
          suggestedBudgetMinor: 500_000,
          pickupArea: 'Yaba',
          destinationArea: null,
          publishedAt: null,
          expiresAt: null,
          offerCount: 2,
          createdAt: '2026-01-01T10:00:00.000Z',
          updatedAt: '2026-01-01T10:00:00.000Z',
        }] : []);
      }),
    );

    renderDashboard('REQUESTER');

    expect(await screen.findByText('Collect a package')).toBeInTheDocument();
    expect(screen.getByText('2 offers waiting for you')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Collect a package/ })).toHaveAttribute('href', '/errands/errand-1');
  });

  it('shows an eligibility blocker and its fix link for an unverified runner', async () => {
    server.use(
      http.get('*/api/v1/me/summary', () => envelope(summary)),
      http.get('*/api/v1/runner/profile', () => envelope({
        transport: 'WALKING',
        areaCenter: { lat: 6.5, lng: 3.4 },
        availability: 'AVAILABLE',
        excludedCategoryIds: [],
        areaRadiusKm: 5,
      })),
      http.get('*/api/v1/runner/eligibility', () => envelope({
        reasons: ['NOT_VERIFIED'],
        canOffer: false,
        canBrowseFeed: false,
      })),
      http.get('*/api/v1/runner/assignments', ({ request }) => {
        const url = new URL(request.url);
        return url.searchParams.get('status') === 'PENDING_ACCEPTANCE'
          ? envelope([{
              id: 'assignment-1',
              errandId: 'errand-1',
              status: 'PENDING_ACCEPTANCE',
              errandStatus: 'PENDING_ACCEPTANCE',
              errandTitle: 'Collect car documents',
              agreedAmountMinor: 250_000,
              acceptanceDeadline: '2026-10-13T23:00:00.000Z',
              pickupArea: 'Ikoyi',
              destinationArea: null,
              selectedAt: '2026-10-13T21:00:00.000Z',
            }])
          : envelope([{
              id: 'active-assignment-1',
              errandId: 'active-errand-1',
              status: 'ACCEPTED',
              errandStatus: 'PICKED_UP',
              errandTitle: 'Deliver a document envelope',
              agreedAmountMinor: 420_000,
              acceptanceDeadline: '2026-10-13T23:00:00.000Z',
              pickupArea: 'Yaba',
              destinationArea: 'Ikeja',
              selectedAt: '2026-10-13T20:00:00.000Z',
            }]);
      }),
      http.get('*/api/v1/runner/offer-limit', () => envelope({
        used: 0,
        limit: 3,
        remaining: 3,
        resetsAt: '2026-01-02T00:00:00.000Z',
        isPro: false,
        isAtLimit: false,
      })),
      http.get('*/api/v1/runner/performance', () => envelope({
        completedErrands: 0,
        rating: { average: null, count: 0 },
        cancellation: { rate: null, count: 0 },
        response: { rate: null, count: 0 },
        badges: [],
      })),
    );

    renderDashboard('RUNNER');

    expect(await screen.findByText(/Complete identity verification before offering/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Verify identity' })).toHaveAttribute('href', '/verification');
    expect(await screen.findByText(/You were selected for “Collect car documents”/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Respond/ })).toHaveAttribute('href', '/assignments/assignment-1');
    expect(await screen.findByText('Deliver a document envelope')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Task progress: picked up' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Go offline' })).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /Deliver a document envelope/ })).toHaveAttribute('href', '/assignments/active-assignment-1');
  });
});
