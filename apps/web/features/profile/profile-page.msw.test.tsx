import * as React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

function renderProfile() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <SessionProvider me={me}>
        <ProfilePage />
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
  it('shows the member-since date and requester stats from the summary endpoint', async () => {
    server.use(
      http.get('*/api/v1/me/summary', () => envelope({
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
          offersThisWeek: 4,
          completedLast30Days: 2,
          changeRequestsToAnswer: 0,
        },
        recentActivity: [],
      })),
    );

    renderProfile();

    expect(screen.getByText(/Member since 10 Mar 2025/)).toBeInTheDocument();
    expect(await screen.findByText('4')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('saves profile fields and the preferred start mode through PATCH /me', async () => {
    let patchBody: unknown;
    server.use(
      http.get('*/api/v1/me/summary', () => envelope({
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
      })),
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
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Ada K. Lovelace' } });
    fireEvent.change(screen.getByLabelText(/About you/), { target: { value: 'Happy to help around Lagos.' } });
    fireEvent.change(screen.getByLabelText('Home area'), { target: { value: 'Yaba' } });
    fireEvent.click(screen.getByRole('button', { name: /Run errands and earn/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() => expect(patchBody).toEqual({
      name: 'Ada K. Lovelace',
      bio: 'Happy to help around Lagos.',
      homeArea: 'Yaba',
      startMode: 'RUNNER',
    }));
    expect(await screen.findByText('Profile updated.')).toBeInTheDocument();
    expect(screen.getByText('Runner account')).toBeInTheDocument();
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
      http.get('*/api/v1/me/summary', () => envelope({
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
      })),
      http.post('*/api/v1/media/uploads', () => envelope({
        media: pendingPhoto,
        upload: {
          method: 'PUT',
          url: '/api/v1/media/photo-1/content',
          headers: { 'Content-Type': 'image/png' },
          expiresAt: '2026-01-01T00:15:00.000Z',
        },
      })),
      http.put('*/api/v1/media/photo-1/content', () => new HttpResponse(null, { status: 204 })),
      http.post('*/api/v1/media/photo-1/confirm', () => envelope({
        ...pendingPhoto,
        status: 'REJECTED',
        rejectionReason: 'NOT_AN_IMAGE',
      })),
    );

    renderProfile();
    fireEvent.change(screen.getByLabelText('Choose images'), {
      target: { files: [new File(['test'], 'fake.png', { type: 'image/png' })] },
    });

    expect(await screen.findByText(/not an image/i, undefined, { timeout: 5_000 })).toBeInTheDocument();
  });

  it('sets the profile photo after upload processing and displays its signed URL', async () => {
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
      http.get('*/api/v1/me/summary', () => envelope({
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
      })),
      http.post('*/api/v1/media/uploads', () => envelope({
        media: pendingPhoto,
        upload: {
          method: 'PUT',
          url: '/api/v1/media/photo-2/content',
          headers: { 'Content-Type': 'image/png' },
          expiresAt: '2026-01-01T00:15:00.000Z',
        },
      })),
      http.put('*/api/v1/media/photo-2/content', () => new HttpResponse(null, { status: 204 })),
      http.post('*/api/v1/media/photo-2/confirm', () => envelope({ ...pendingPhoto, status: 'READY' })),
      http.put('*/api/v1/me/photo', async ({ request }) => {
        photoBody = await request.json();
        return envelope({ ...me, photoMediaId: 'photo-2' });
      }),
      http.get('*/api/v1/media/photo-2/url', () =>
        envelope({ url: 'https://media.example/profile.png', variant: 'full', expiresAt: '2026-01-01T00:05:00.000Z' }),
      ),
    );

    renderProfile();
    fireEvent.change(screen.getByLabelText('Choose images'), {
      target: { files: [new File(['test'], 'profile.png', { type: 'image/png' })] },
    });

    expect(await screen.findByRole('img', { name: 'Ada Lovelace profile photo' }, { timeout: 5_000 })).toHaveAttribute(
      'src',
      'https://media.example/profile.png',
    );
    expect(photoBody).toEqual({ mediaId: 'photo-2' });
  });
});
