'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoadingFrame } from '@/components/shell/loading-frame';
import { clearBrowserSession, isApiError, refreshBrowserSession, safeRedirect } from '@/lib/api/client';

/**
 * Landing point for a protected URL opened without an access cookie.
 * The refresh cookie is only sent to /api/v1/auth, so the browser must make this call itself.
 */
function SessionRefresh() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = safeRedirect(params.get('redirect'));

  useEffect(() => {
    let cancelled = false;
    refreshBrowserSession()
      .then((result) => {
        if (cancelled) return;
        if (result === 'refreshed') {
          router.replace(redirect);
        } else {
          // Ask the API to expire the cookies the browser still holds, so /login is not bounced back.
          void fetch('/api/v1/auth/logout', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: '{}',
          }).catch(() => undefined).finally(() => {
            if (cancelled) return;
            clearBrowserSession();
            router.replace(`/login?reason=session-expired&redirect=${encodeURIComponent(redirect)}`);
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const params = new URLSearchParams({ reason: 'session-check-failed', redirect });
          if (isApiError(error) && error.requestId) params.set('requestId', error.requestId);
          router.replace(`/login?${params.toString()}`);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [redirect, router]);

  // Same pulsing mascot as every other loading state, so the session check reads as part of loading.
  return <LoadingFrame />;
}

export default function SessionPage() {
  return (
    <Suspense fallback={<LoadingFrame />}>
      <SessionRefresh />
    </Suspense>
  );
}
