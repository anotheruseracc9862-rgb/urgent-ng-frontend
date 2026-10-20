'use client';

import * as React from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@urgent/ui';
import { useSession } from '@/lib/auth/client';

/** Phones have no account menu in the topbar, so this puts Sign out at the end of account pages. */
export function MobileSignOut() {
  const { signOut } = useSession();
  const [busy, setBusy] = React.useState(false);
  return (
    <div className="sm:hidden">
      <Button
        type="button"
        variant="ghost"
        className="min-h-12 w-full justify-center gap-2 border border-line bg-surface font-bold text-red"
        disabled={busy}
        onClick={() => { setBusy(true); void signOut().finally(() => setBusy(false)); }}
      >
        <LogOut aria-hidden="true" className="size-4" />
        {busy ? 'Signing out…' : 'Sign out'}
      </Button>
    </div>
  );
}
