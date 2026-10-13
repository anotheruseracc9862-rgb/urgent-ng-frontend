import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api/client';
import {
  NotificationPreferencesForm,
  type NotificationPreference,
  type QuietHours,
} from './notification-preferences-form';

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, api: vi.fn() };
});

const preferences: NotificationPreference[] = [
  { category: 'TRANSACTIONAL', channel: 'IN_APP', enabled: true },
  { category: 'SAFETY', channel: 'IN_APP', enabled: true },
  { category: 'MARKETPLACE', channel: 'PUSH', enabled: true },
];

const quietHours: QuietHours = { start: '22:00', end: '06:00', isDefault: true };

afterEach(() => {
  vi.clearAllMocks();
});

describe('NotificationPreferencesForm', () => {
  it('keeps mandatory categories enabled and disabled', () => {
    render(
      <NotificationPreferencesForm
        initialPreferences={preferences}
        initialQuietHours={quietHours}
      />,
    );

    const transactional = screen.getByRole('checkbox', {
      name: 'In app notifications for Errand updates',
    });
    const safety = screen.getByRole('checkbox', {
      name: 'In app notifications for Safety and account',
    });

    expect(transactional).toBeChecked();
    expect(transactional).toBeDisabled();
    expect(safety).toBeChecked();
    expect(safety).toBeDisabled();
  });

  it('saves preference and quiet-hours changes to their API endpoints', async () => {
    const user = userEvent.setup();
    vi.mocked(api)
      .mockResolvedValueOnce(preferences)
      .mockResolvedValueOnce(quietHours);

    render(
      <NotificationPreferencesForm
        initialPreferences={preferences}
        initialQuietHours={quietHours}
      />,
    );

    await user.click(
      screen.getByRole('checkbox', { name: 'Push notifications for Nearby errands' }),
    );
    await user.click(screen.getByRole('button', { name: 'Save settings' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Notification settings saved.');
    });
    expect(api).toHaveBeenNthCalledWith(1, '/me/notification-preferences', {
      method: 'PUT',
      body: {
        preferences: [
          { ...preferences[0] },
          { ...preferences[1] },
          { ...preferences[2], enabled: false },
        ],
      },
    });
    expect(api).toHaveBeenNthCalledWith(2, '/me/quiet-hours', {
      method: 'PUT',
      body: { start: null, end: null },
    });
  });

  it('prevents identical quiet-hour start and end values', async () => {
    const user = userEvent.setup();
    render(
      <NotificationPreferencesForm
        initialPreferences={preferences}
        initialQuietHours={quietHours}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: 'Use custom quiet hours' }));
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '22:00' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '22:00' } });
    await user.click(screen.getByRole('button', { name: 'Save settings' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Quiet hours must start and end at different times.',
    );
    expect(api).not.toHaveBeenCalled();
  });
});
