'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { safeRedirect } from '@/lib/api/client';

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
    fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          router.replace(redirect);
        } else {
          router.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
        }
      })
      .catch(() => {
        if (!cancelled) router.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
      });
    return () => {
      cancelled = true;
    };
  }, [redirect, router]);

  return (
    <div className="grid min-h-screen place-items-center bg-bg">
      <div className="flex items-center gap-3 text-muted text-sm font-semibold">
        <span className="size-5 animate-spin rounded-full border-2 border-line border-t-lime-600" />
        Checking your session…
      </div>
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense fallback={null}>
      <SessionRefresh />
    </Suspense>
  );
}
