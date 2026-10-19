'use client';

import * as React from 'react';
import { useApiMutation } from '@/lib/query/mutations';
import type { components } from '@urgent/api-client';
import { Alert, Button } from '@urgent/ui';
import { api, isApiError } from '@/lib/api/client';

const FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
  vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? '',
};
const CONFIGURED = Object.values(FIREBASE_CONFIG).every(Boolean);
const DEVICE_STORAGE_KEY = 'urgent.web-push-device-id';

export function PushOptInPrompt() {
  const [dismissed, setDismissed] = React.useState(false);
  const register = useApiMutation({
    // The browser appears in the signed-in devices list.
    affects: ['security'],
    mutationFn: async () => {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        throw new Error('Push notifications are not supported in this browser.');
      }
      if (!CONFIGURED) throw new Error('Push notifications are not configured yet.');

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error(permission === 'denied'
          ? 'Notifications are blocked in browser settings. Change the setting to enable push.'
          : 'Notification permission was not granted.');
      }

      const [{ getApp, getApps, initializeApp }, { getMessaging, getToken, isSupported }] = await Promise.all([
        import('@firebase/app'),
        import('@firebase/messaging'),
      ]);
      if (!(await isSupported())) throw new Error('Push notifications are not supported in this browser.');

      const app = getApps().length ? getApp() : initializeApp({
        apiKey: FIREBASE_CONFIG.apiKey,
        projectId: FIREBASE_CONFIG.projectId,
        messagingSenderId: FIREBASE_CONFIG.messagingSenderId,
        appId: FIREBASE_CONFIG.appId,
      });
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const token = await getToken(getMessaging(app), {
        vapidKey: FIREBASE_CONFIG.vapidKey,
        serviceWorkerRegistration: registration,
      });
      if (!token) throw new Error('The browser did not provide a push token. Please try again.');

      const device = await api<components['schemas']['DeviceViewDto']>('/me/devices', {
        method: 'POST',
        body: { type: 'WEB_PUSH', pushToken: token },
      });
      localStorage.setItem(DEVICE_STORAGE_KEY, device.id);
      return device;
    },
  });

  if (dismissed) return null;

  return (
    <section aria-label="Push notification option" className="grid gap-3 rounded-[var(--r-lg)] bg-tint p-4 sm:p-[22px]">
      <div>
        <h2 className="text-sm font-extrabold text-ink">Get updates when you are away</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">Allow browser notifications for important offers, messages and errand updates. You can change this later in browser settings.</p>
      </div>
      {register.error ? (
        <Alert variant="danger" role="alert">
          <p>{isApiError(register.error) ? 'We could not enable push notifications.' : register.error instanceof Error ? register.error.message : 'We could not enable push notifications.'}</p>
          {isApiError(register.error) && register.error.requestId ? <p className="mt-1 text-xs">Request ID: {register.error.requestId}</p> : null}
        </Alert>
      ) : null}
      {!CONFIGURED ? <p className="text-xs text-muted">Browser push is not configured for this environment yet.</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={!CONFIGURED || register.isPending} onClick={() => register.mutate()}>
          {register.isPending ? 'Enabling…' : register.isSuccess ? 'Enabled' : 'Enable notifications'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setDismissed(true)}>Not now</Button>
      </div>
    </section>
  );
}
