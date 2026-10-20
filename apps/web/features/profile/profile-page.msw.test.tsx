import * as React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ShellMode } from '@/components/shell/nav-items';
import { Sidebar } from '@/components/shell/sidebar';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { listen, server } from '@/test/msw/server';
import { ProfilePage } from './profile-page';

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh,
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/profile',
  useSearchParams: () => new URLSearchParams(),
}));

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

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-profile' });

function renderProfile(mode: ShellMode = 'REQUESTER', profile: Me = me) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <SessionProvider me={profile}>
        <ProfilePage mode={mode} />
      </SessionProvider>
    </QueryClientProvider>,
  );
}

beforeAll(() => listen());
beforeEach(() => {
  refresh.mockClear();
  URL.createObjectURL = vi.fn().mockReturnValue('blob:preview');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());

describe('profile page', () => {
  it.each(['REQUESTER', 'RUNNER'] as const)(
    'shows %s activity and tools for the active mode, not the preferred mode',
    async (mode) => {
      server.use(
        http.get('*/api/v1/me/summary', () =>
          envelope({
            asRequester: {
              errandsThisMonth: 4,
              completedThisMonth: 2,
              openErrands: 1,
              activeErrands: 0,
              successRate: null,
              errandsWithOffers: 0,
              offersToReview: 0,
              awaitingRunnerAcceptance: 0,
              deliveriesToConfirm: 0,
              changeRequestsToAnswer: 0,
            },
            asRunner: {
              activeAssignments: 3,
              selectedAwaitingYou: 0,
              activeOffers: 1,
              offersAwaitingYou: 0,
              offersThisWeek: 7,
              completedLast30Days: 9,
              changeRequestsToAnswer: 0,
            },
            recentActivity: [],
          }),
        ),
      );

      renderProfile(mode, { ...me, startMode: mode === 'REQUESTER' ? 'RUNNER' : 'REQUESTER' });

      expect(screen.getByText(/Member since 10 Mar 2025/)).toBeInTheDocument();
      expect(screen.getByLabelText('Display name')).toHaveValue('Ada Lovelace');
      expect(screen.getByRole('link', { name: 'Reviews' })).toHaveAttribute('href', '/ratings');
      const support = within(screen.getByRole('navigation', { name: 'Account and support' }));
      expect(support.getByRole('link', { name: 'Settings', exact: true })).toHaveAttribute('href', '/settings');
      expect(support.getByRole('link', { name: 'Orders and receipts' })).toHaveAttribute(
        'href',
        '/profile/orders',
      );
      const stats = within(screen.getByRole('region', { name: 'Profile stats' }));
      if (mode === 'REQUESTER') {
        expect(screen.getByText('Requester mode')).toBeInTheDocument();
        expect(await stats.findByText('4')).toBeInTheDocument();
        expect(stats.getByText('2')).toBeInTheDocument();
        expect(stats.getByText('1')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Boosts' })).toHaveAttribute('href', '/boosts');
        for (const label of [
          'Runner profile & area',
          'Runner Pro',
          'Verification',
          'Saved errands',
          'Job history',
        ]) {
          expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument();
        }
      } else {
        expect(screen.getByText('Runner mode')).toBeInTheDocument();
        expect(await stats.findByText('9')).toBeInTheDocument();
        expect(stats.getByText('7')).toBeInTheDocument();
        expect(stats.getByText('3')).toBeInTheDocument();
        expect(stats.queryByText('Errands this month')).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Runner profile & area' })).toHaveAttribute(
          'href',
          '/runner/profile',
        );
        expect(screen.getByRole('link', { name: 'Runner Pro' })).toHaveAttribute('href', '/pro');
        expect(screen.getByRole('link', { name: 'Verification' })).toHaveAttribute(
          'href',
          '/verification',
        );
        expect(screen.getByRole('link', { name: 'Saved errands' })).toHaveAttribute(
          'href',
          '/marketplace/saved',
        );
        expect(screen.getByRole('link', { name: 'Job history' })).toHaveAttribute(
          'href',
          '/runner/history',
        );
        expect(screen.queryByRole('link', { name: 'Boosts' })).not.toBeInTheDocument();
      }
    },
  );

  it('saves profile fields and the preferred start mode through PATCH /me', async () => {
    let patchBody: unknown;
    server.use(
      http.get('*/api/v1/me/summary', () =>
        envelope({
          asRequester: {
            errandsThisMonth: 0,
            completedThisMonth: 0,
            openErrands: 0,
            activeErrands: 0,
            successRate: null,
            errandsWithOffers: 0,
            offersToReview: 0,
            awaitingRunnerAcceptance: 0,
            deliveriesToConfirm: 0,
            changeRequestsToAnswer: 0,
          },
          asRunner: {
            activeAssignments: 0,
            selectedAwaitingYou: 0,
            activeOffers: 0,
            offersAwaitingYou: 0,
            offersThisWeek: 0,
            completedLast30Days: 0,
            changeRequestsToAnswer: 0,
          },
          recentActivity: [],
        }),
      ),
      http.patch('*/api/v1/me', async ({ request }) => {
        patchBody = await request.json();
        return envelope({
          ...me,
          name: 'Ada K. Lovelace',
          bio: 'Happy to help around Lagos.',
          homeArea: 'Yaba',
          startMode: 'RUNNER',
        });
      }),
    );

    renderProfile();
    fireEvent.change(screen.getByLabelText('Display name'), {
      target: { value: 'Ada K. Lovelace' },
    });
    fireEvent.change(screen.getByLabelText(/About you/), {
      target: { value: 'Happy to help around Lagos.' },
    });
    fireEvent.change(screen.getByLabelText('Home area'), { target: { value: 'Yaba' } });
    fireEvent.click(screen.getByRole('button', { name: /Run errands and earn/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() =>
      expect(patchBody).toEqual({
        name: 'Ada K. Lovelace',
        bio: 'Happy to help around Lagos.',
        homeArea: 'Yaba',
        startMode: 'RUNNER',
      }),
    );
    expect(await screen.findByText('Profile updated.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ada K. Lovelace' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Run errands and earn/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(refresh).toHaveBeenCalled();
  });

  it('shows the rejection reason for an uploaded profile photo', async () => {
    const pendingPhoto = {
      id: 'photo-1',
      purpose: 'PROFILE_PHOTO',
      status: 'PENDING',
      moderationStatus: 'NONE',
      width: null,
      height: null,
      rejectionReason: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      confirmedAt: null,
      mimeType: 'image/png',
      sizeBytes: 4,
    };
    server.use(
      http.get('*/api/v1/me/summary', () =>
        envelope({
          asRequester: {
            errandsThisMonth: 0,
            completedThisMonth: 0,
            openErrands: 0,
            activeErrands: 0,
            successRate: null,
            errandsWithOffers: 0,
            offersToReview: 0,
            awaitingRunnerAcceptance: 0,
            deliveriesToConfirm: 0,
            changeRequestsToAnswer: 0,
          },
          asRunner: {
            activeAssignments: 0,
            selectedAwaitingYou: 0,
            activeOffers: 0,
            offersAwaitingYou: 0,
            offersThisWeek: 0,
            completedLast30Days: 0,
            changeRequestsToAnswer: 0,
          },
          recentActivity: [],
        }),
      ),
      http.post('*/api/v1/media/uploads', () =>
        envelope({
          media: pendingPhoto,
          upload: {
            method: 'PUT',
            url: '/api/v1/media/photo-1/content',
            headers: { 'Content-Type': 'image/png' },
            expiresAt: '2026-01-01T00:15:00.000Z',
          },
        }),
      ),
      http.put('*/api/v1/media/photo-1/content', () => new HttpResponse(null, { status: 204 })),
      http.post('*/api/v1/media/photo-1/confirm', () =>
        envelope({
          ...pendingPhoto,
          status: 'REJECTED',
          rejectionReason: 'NOT_AN_IMAGE',
        }),
      ),
    );

    renderProfile();
    fireEvent.click(screen.getByRole('button', { name: 'Change photo' }));
    fireEvent.change(screen.getByLabelText('Choose images'), {
      target: { files: [new File(['test'], 'fake.png', { type: 'image/png' })] },
    });

    expect(
      await screen.findByText(/not an image/i, undefined, { timeout: 5_000 }),
    ).toBeInTheDocument();
  });

  it('sets the uploaded profile photo in the profile and sidebar without a reload', async () => {
    const pendingPhoto = {
      id: 'photo-2',
      purpose: 'PROFILE_PHOTO',
      status: 'PENDING',
      moderationStatus: 'NONE',
      width: null,
      height: null,
      rejectionReason: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      confirmedAt: null,
      mimeType: 'image/png',
      sizeBytes: 4,
    };
    let photoBody: unknown;
    server.use(
      http.get('*/api/v1/conversations', () => envelope([])),
      http.get('*/api/v1/notifications/unread-count', () => envelope({ count: 0 })),
      http.get('*/api/v1/me/summary', () =>
        envelope({
          asRequester: {
            errandsThisMonth: 0,
            completedThisMonth: 0,
            openErrands: 0,
            activeErrands: 0,
            successRate: null,
            errandsWithOffers: 0,
            offersToReview: 0,
            awaitingRunnerAcceptance: 0,
            deliveriesToConfirm: 0,
            changeRequestsToAnswer: 0,
          },
          asRunner: {
            activeAssignments: 0,
            selectedAwaitingYou: 0,
            activeOffers: 0,
            offersAwaitingYou: 0,
            offersThisWeek: 0,
            completedLast30Days: 0,
            changeRequestsToAnswer: 0,
          },
          recentActivity: [],
        }),
      ),
      http.post('*/api/v1/media/uploads', () =>
        envelope({
          media: pendingPhoto,
          upload: {
            method: 'PUT',
            url: '/api/v1/media/photo-2/content',
            headers: { 'Content-Type': 'image/png' },
            expiresAt: '2026-01-01T00:15:00.000Z',
          },
        }),
      ),
      http.put('*/api/v1/media/photo-2/content', () => new HttpResponse(null, { status: 204 })),
      http.post('*/api/v1/media/photo-2/confirm', () =>
        envelope({ ...pendingPhoto, status: 'READY' }),
      ),
      http.put('*/api/v1/me/photo', async ({ request }) => {
        photoBody = await request.json();
        return envelope({ ...me, photoMediaId: 'photo-2' });
      }),
      http.get('*/api/v1/media/photo-2/url', () =>
        envelope({
          url: 'https://media.example/profile.png',
          variant: 'full',
          expiresAt: '2026-01-01T00:05:00.000Z',
        }),
      ),
    );

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <SessionProvider me={me}>
          <Sidebar mode="REQUESTER" name={me.name} />
          <ProfilePage mode="REQUESTER" />
        </SessionProvider>
      </QueryClientProvider>,
    );
    const account = within(screen.getByRole('button', { name: 'Account menu' }));
    expect(account.getByText('AL')).toBeInTheDocument();
    expect(screen.getByLabelText('Choose images')).not.toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Change photo' }));
    expect(screen.getByLabelText('Choose images')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Choose images'), {
      target: { files: [new File(['test'], 'profile.png', { type: 'image/png' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Close photo editor' }));
    expect(screen.getByLabelText('Choose images')).not.toBeVisible();

    expect(
      await screen.findByRole('img', { name: 'Ada Lovelace profile photo' }, { timeout: 5_000 }),
    ).toHaveAttribute('src', 'https://media.example/profile.png');
    expect(await account.findByRole('img', { name: 'Your profile photo' })).toHaveAttribute(
      'src',
      'https://media.example/profile.png',
    );
    expect(account.queryByText('AL')).not.toBeInTheDocument();
    expect(photoBody).toEqual({ mediaId: 'photo-2' });

    fireEvent.error(account.getByRole('img', { name: 'Your profile photo' }));
    expect(account.getByText('AL')).toBeInTheDocument();
    expect(account.queryByRole('img')).not.toBeInTheDocument();
  });
});
