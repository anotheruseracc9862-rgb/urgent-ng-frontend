'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@urgent/ui';
import { api } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';
import type { UserStatus } from '@/lib/api/types';
import { describeAuthError, FormError } from '@/features/auth/auth-ui';

export function StandingActions({ status }: { status: UserStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      router.replace('/dashboard');
      router.refresh();
    } catch (e) {
      setError(describeAuthError(e));
      setBusy(false);
    }
  };

  const signOut = async () => {
    try {
      await authApi.logout();
    } catch {
      // Idempotent.
    }
    router.replace('/login');
    router.refresh();
  };

  return (
    <div className="grid gap-3">
      <FormError message={error} />
      {status === 'DEACTIVATED' ? (
        <Button disabled={busy} onClick={() => void run(() => api('/me/reactivate', { method: 'POST', body: {} }))}>
          Reactivate my account
        </Button>
      ) : null}
      {status === 'DELETION_PENDING' ? (
        <Button disabled={busy} onClick={() => void run(() => api('/me/delete-request', { method: 'DELETE' }))}>
          Cancel deletion
        </Button>
      ) : null}
      <Button variant="ghost" onClick={() => void signOut()}>
        Sign out
      </Button>
    </div>
  );
}
