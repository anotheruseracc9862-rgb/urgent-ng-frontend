import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'k';
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'p';
  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 's';
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID = 'a';
  process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY = 'v';
  return { api: vi.fn(), requestPermission: vi.fn() };
});

vi.mock('@/lib/api/client', () => ({ api: mocks.api, isApiError: () => false }));
vi.mock('@firebase/app', () => ({ getApps: () => [], getApp: vi.fn(), initializeApp: () => ({}) }));
vi.mock('@firebase/messaging', () => ({
  isSupported: async () => true,
  getMessaging: () => ({}),
  getToken: async () => 'push-token',
}));

import { PushOptInPrompt } from './push-opt-in-prompt';

beforeEach(() => {
  mocks.api.mockReset().mockResolvedValue({ id: 'device-1' });
  mocks.requestPermission.mockReset().mockResolvedValue('granted');
  vi.stubGlobal('Notification', { requestPermission: mocks.requestPermission });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { register: vi.fn().mockResolvedValue({}) },
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const renderPrompt = () => render(
  <QueryClientProvider client={new QueryClient()}><PushOptInPrompt /></QueryClientProvider>,
);

describe('PushOptInPrompt when this browser already has push', () => {
  const enabledHere = () => {
    vi.stubGlobal('Notification', { permission: 'granted', requestPermission: mocks.requestPermission });
    localStorage.setItem('urgent.web-push-device-id', 'device-1');
  };
  afterEach(() => localStorage.clear());

  it('asks nothing, wherever it sits', () => {
    enabledHere();
    renderPrompt();
    expect(screen.queryByLabelText('Push notification option')).toBeNull();
    cleanup();
    render(<QueryClientProvider client={new QueryClient()}><PushOptInPrompt compact /></QueryClientProvider>);
    expect(screen.queryByLabelText('Push notification option')).toBeNull();
  });

  it('registers quietly, without asking again, when permission was granted but this browser has no registered device', async () => {
    vi.stubGlobal('Notification', { permission: 'granted', requestPermission: mocks.requestPermission });
    renderPrompt();
    expect(screen.queryByLabelText('Push notification option')).toBeNull();
    await waitFor(() => expect(mocks.api).toHaveBeenCalledWith('/me/devices', expect.objectContaining({ method: 'POST' })));
    expect(localStorage.getItem('urgent.web-push-device-id')).toBe('device-1');
    expect(screen.queryByLabelText('Push notification option')).toBeNull();
  });

  it('shows the prompt with the reason when that quiet registration fails', async () => {
    vi.stubGlobal('Notification', { permission: 'granted', requestPermission: mocks.requestPermission });
    mocks.api.mockRejectedValue(new Error('Push is down.'));
    renderPrompt();
    expect(await screen.findByText('Push is down.')).toBeTruthy();
  });

  it('still asks on a browser where it is off, even if it is on for the same person elsewhere: push is per device', () => {
    vi.stubGlobal('Notification', { permission: 'default', requestPermission: mocks.requestPermission });
    renderPrompt();
    expect(screen.getByLabelText('Push notification option')).toBeTruthy();
  });
});

describe('PushOptInPrompt', () => {
  it('does not ask for permission on load', () => {
    renderPrompt();
    expect(mocks.requestPermission).not.toHaveBeenCalled();
    expect(mocks.api).not.toHaveBeenCalled();
  });

  it('asks on click and registers a WEB_PUSH device', async () => {
    renderPrompt();
    fireEvent.click(screen.getByRole('button', { name: 'Enable notifications' }));
    await waitFor(() => expect(mocks.api).toHaveBeenCalledWith('/me/devices', {
      method: 'POST',
      body: { type: 'WEB_PUSH', pushToken: 'push-token' },
    }));
    expect(mocks.requestPermission).toHaveBeenCalledTimes(1);
  });

  it('goes away as soon as notifications are enabled, without a reload', async () => {
    renderPrompt();
    fireEvent.click(screen.getByRole('button', { name: 'Enable notifications' }));
    await waitFor(() => expect(screen.queryByLabelText('Push notification option')).toBeNull());
  });

  it('stays visible after a denied permission so the reason can be read', async () => {
    mocks.requestPermission.mockResolvedValue('denied');
    renderPrompt();
    fireEvent.click(screen.getByRole('button', { name: 'Enable notifications' }));
    expect(await screen.findByText(/blocked in browser settings/i)).toBeTruthy();
    expect(screen.getByLabelText('Push notification option')).toBeTruthy();
  });

  it('registers no device when permission is denied', async () => {
    mocks.requestPermission.mockResolvedValue('denied');
    renderPrompt();
    fireEvent.click(screen.getByRole('button', { name: 'Enable notifications' }));
    expect(await screen.findByText(/blocked in browser settings/i)).toBeTruthy();
    expect(mocks.api).not.toHaveBeenCalled();
  });
});
