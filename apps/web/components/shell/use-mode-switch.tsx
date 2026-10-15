'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth/client';
import { saveMode } from '@/lib/auth/mode';
import { hasSeenModeIntro, markModeIntroSeen } from '@/lib/auth/runner-intro';
import { ModeIntroDialog } from './mode-intro-dialog';
import type { ShellMode } from './nav-items';

/**
 * Switching between requester and runner view. The first switch into each mode shows what it
 * means and asks for confirmation, so a stray click does not drop someone into another workspace.
 */
export function useModeSwitch(current: ShellMode) {
  const router = useRouter();
  const { me } = useSession();
  const [introFor, setIntroFor] = React.useState<ShellMode | null>(null);
  // Keeps the last mode's content while the dialog animates closed.
  const [lastShown, setLastShown] = React.useState<ShellMode>('RUNNER');

  const apply = React.useCallback((next: ShellMode) => {
    saveMode(next);
    router.push('/dashboard');
    router.refresh();
  }, [router]);

  const requestSwitch = React.useCallback((next: ShellMode) => {
    if (next === current) return;
    // The mode someone chose when signing up is already familiar.
    const known = me.startMode === next || hasSeenModeIntro(me.id, next);
    if (!known) {
      setLastShown(next);
      setIntroFor(next);
      return;
    }
    apply(next);
  }, [apply, current, me.id, me.startMode]);

  const dialog = (
    <ModeIntroDialog
      mode={introFor ?? lastShown}
      open={introFor !== null}
      onOpenChange={(open) => { if (!open) setIntroFor(null); }}
      onConfirm={() => {
        if (!introFor) return;
        const next = introFor;
        markModeIntroSeen(me.id, next);
        setIntroFor(null);
        apply(next);
      }}
    />
  );

  return { requestSwitch, dialog };
}
