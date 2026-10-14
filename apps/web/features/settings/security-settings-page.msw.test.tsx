import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { listen, server } from '@/test/msw/server';
import { SecuritySettingsPage } from './security-settings-page';

const me: Me = {
  id: 'user-security-1',
  name: 'Ada Lovelace',
  firstName: 'Ada',
  lastName: 'Lovelace',
  phone: '+2348031234567',
  phoneVerified: true,
  email: null,
  emailVerified: false,
  hasPassword: true,
  googleLinked: false,
  status: 'ACTIVE',
  startMode: 'RUNNER',
  photoMediaId: null,
  bio: null,
  homeArea: null,
  deletionScheduledAt: null,
  createdAt: '2025-03-10T00:00:00.000Z',
};

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-security' });
const currentSession = {
  id: 'session-current',
  userAgent: 'Chrome on Windows',
  ip: '192.0.2.10',
  startedAt: '2026-01-10T12:00:00.000Z',
  lastRefreshedAt: '2026-02-10T12:00:00.000Z',
  expiresAt: '2026-02-11T12:00:00.000Z',
  current: true,
};
const remoteSession = { ...currentSession, id: 'session-remote', userAgent: 'Safari on iPhone', current: false };
const registeredDevice = {
  id: 'device-mobile',
  type: 'MOBILE_PUSH',
  active: true,
  lastSeenAt: '2026-02-10T12:00:00.000Z',
  createdAt: '2026-01-10T12:00:00.000Z',
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider me={me}>
        <SecuritySettingsPage />
      </SessionProvider>
    </QueryClientProvider>,
  );
}

beforeAll(() => listen());
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());

describe('security settings', () => {
  it('lists sessions without exposing IPs and revokes only a non-current session', async () => {
    const user = userEvent.setup();
    let sessions = [currentSession, remoteSession];
    let revokedPath: string | undefined;
    server.use(
      http.get('*/api/v1/me/sessions', () => envelope(sessions)),
      http.get('*/api/v1/me/devices', () => envelope([registeredDevice])),
      http.delete('*/api/v1/me/sessions/:id', ({ params }) => {
        revokedPath = String(params.id);
        sessions = sessions.filter(({ id }) => id !== revokedPath);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Security' })).toBeInTheDocument();
    expect(await screen.findByText('Chrome on Windows')).toBeInTheDocument();
    expect(screen.getByText('Safari on iPhone')).toBeInTheDocument();
    expect(screen.getByText('Mobile device')).toBeInTheDocument();
    expect(screen.queryByText('192.0.2.10')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Revoke' })).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Revoke' }));
    await waitFor(() => expect(revokedPath).toBe('session-remote'));
    await waitFor(() => expect(screen.queryByText('Safari on iPhone')).not.toBeInTheDocument());
    expect(screen.getByText('Chrome on Windows')).toBeInTheDocument();
  });

  it('removes a registered notification device and presents clear empty states', async () => {
    const user = userEvent.setup();
    let devices = [registeredDevice];
    server.use(
      http.get('*/api/v1/me/sessions', () => envelope([currentSession])),
      http.get('*/api/v1/me/devices', () => envelope(devices)),
      http.delete('*/api/v1/me/devices/:id', ({ params }) => {
        devices = devices.filter(({ id }) => id !== params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderPage();

    expect(await screen.findByText('Mobile device')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(await screen.findByText(/No notification devices are registered/)).toBeInTheDocument();
  });
});
