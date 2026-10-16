import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api/client';
import { listen, server } from '@/test/msw/server';
import {
  NotificationPreferencesForm,
  type NotificationPreference,
  type QuietHours,
} from './notification-preferences-form';

const envelope = (data: unknown) =>
  HttpResponse.json({ data, meta: {}, requestId: 'req-settings' });

beforeAll(() => {
  listen();
  // Radix measures its hidden form input; jsdom has no layout observer.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => {
  server.close();
  vi.unstubAllGlobals();
});

describe('notification preferences through the API client', () => {
  it('persists channel preferences and quiet hours through their endpoints', async () => {
    const user = userEvent.setup();
    let storedPreferences: NotificationPreference[] = [
      { category: 'TRANSACTIONAL', channel: 'IN_APP', enabled: true },
      { category: 'SAFETY', channel: 'IN_APP', enabled: true },
      { category: 'MARKETPLACE', channel: 'PUSH', enabled: true },
    ];
    let storedQuietHours: QuietHours = { start: '22:00', end: '06:00', isDefault: true };

    server.use(
      http.put('*/api/v1/me/notification-preferences', async ({ request }) => {
        const body = (await request.json()) as { preferences: NotificationPreference[] };
        storedPreferences = body.preferences;
        return envelope(storedPreferences);
      }),
      http.get('*/api/v1/me/notification-preferences', () => envelope(storedPreferences)),
      http.put('*/api/v1/me/quiet-hours', async ({ request }) => {
        const body = (await request.json()) as { start: string | null; end: string | null };
        storedQuietHours =
          body.start === null || body.end === null
            ? { start: '22:00', end: '06:00', isDefault: true }
            : { ...body, isDefault: false };
        return envelope(storedQuietHours);
      }),
      http.get('*/api/v1/me/quiet-hours', () => envelope(storedQuietHours)),
    );

    render(
      <NotificationPreferencesForm
        initialPreferences={storedPreferences}
        initialQuietHours={storedQuietHours}
      />,
    );
    await user.click(
      screen.getByRole('checkbox', { name: 'Push notifications for Nearby errands' }),
    );
    await user.click(screen.getByRole('checkbox', { name: 'Use custom quiet hours' }));
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '23:30' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '05:30' } });
    await user.click(screen.getByRole('button', { name: 'Save settings' }));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Notification settings saved.'),
    );
    expect(await api<NotificationPreference[]>('/me/notification-preferences')).toEqual([
      { category: 'TRANSACTIONAL', channel: 'IN_APP', enabled: true },
      { category: 'SAFETY', channel: 'IN_APP', enabled: true },
      { category: 'MARKETPLACE', channel: 'PUSH', enabled: false },
    ]);
    expect(await api<QuietHours>('/me/quiet-hours')).toEqual({
      start: '23:30',
      end: '05:30',
      isDefault: false,
    });
  });
});
