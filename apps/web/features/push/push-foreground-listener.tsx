'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { pushEnabledHere } from './push-opt-in-prompt';
import { showPushToast } from './push-toast';

const FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
};

/** Where a push should take the person. Mirrors the service worker, which handles the app being closed. */
function pathFor(data: Record<string, string>): string {
  const id = data.conversationId || data.assignmentId || data.errandId || data.offerId;
  if (!id) return '/notifications';
  const safe = encodeURIComponent(id);
  if (data.type?.startsWith('message.')) return `/messages/${safe}`;
  if (data.type?.startsWith('assignment.')) return `/assignments/${safe}`;
  if (data.type?.startsWith('offer.')) return `/offers/${safe}`;
  return `/errands/${safe}`;
}

/**
 * Shows pushes that arrive while the app is open. Firebase hands those to the page, not to the
 * service worker, so without this nothing appears or sounds when the app is in front.
 */
export function PushForegroundListener() {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = React.useRef(pathname);
  React.useEffect(() => { pathRef.current = pathname; }, [pathname]);

  React.useEffect(() => {
    if (!pushEnabledHere() || !Object.values(FIREBASE_CONFIG).every(Boolean)) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        const [{ getApp, getApps, initializeApp }, { getMessaging, isSupported, onMessage }] = await Promise.all([
          import('@firebase/app'),
          import('@firebase/messaging'),
        ]);
        if (cancelled || !(await isSupported())) return;
        const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
        unsubscribe = onMessage(getMessaging(app), (payload) => {
          const data = (payload.data ?? {}) as Record<string, string>;
          const title = payload.notification?.title ?? data.title ?? 'Urgent.ng update';
          const body = payload.notification?.body ?? data.body ?? 'You have a new update.';
          const path = pathFor(data);
          // Already looking at that conversation or page: the live view shows it.
          if (pathRef.current === path) return;

          showPushToast({ title, body, type: data.type, onOpen: () => router.push(path) });
          // A system notification gives the sound and the pop-up the toast cannot.
          void navigator.serviceWorker?.getRegistration('/firebase-messaging-sw.js').then((registration) => {
            void registration?.showNotification(title, {
              body,
              icon: '/icons/icon-192.png',
              tag: data.notificationId ?? `${data.type ?? 'update'}:${path}`,
              data: { path },
            });
          });
        });
      } catch {
        // Push is a bonus: a failure here must never break the app.
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [router]);

  return null;
}
