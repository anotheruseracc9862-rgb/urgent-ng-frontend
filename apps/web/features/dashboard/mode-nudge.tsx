'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeftRight } from 'lucide-react';
import { Button } from '@urgent/ui';
import { saveMode } from '@/lib/auth/mode';
import type { ShellMode } from '@/components/shell/nav-items';

const COPY: Record<ShellMode, { title: string; text: string; action: string }> = {
  // Shown while in Requester mode: the person can also earn with the same account.
  REQUESTER: {
    title: 'Want to earn too?',
    text: 'Switch to Runner mode with the same account. You verify your identity once before you can send offers.',
    action: 'Switch to Runner mode',
  },
  // Shown while in Runner mode: the person can also post errands.
  RUNNER: {
    title: 'Need something done?',
    text: 'Switch to Requester mode with the same account and post an errand. No extra sign-up.',
    action: 'Switch to Requester mode',
  },
};

/** One account, two modes: points at the mode the person is not using, and switches in place. */
export function ModeNudge({ mode }: { mode: ShellMode }) {
  const router = useRouter();
  const other: ShellMode = mode === 'RUNNER' ? 'REQUESTER' : 'RUNNER';
  const copy = COPY[mode];

  return (
    <aside
      aria-label="Switch mode"
      className="flex flex-col gap-3 rounded-[var(--r-lg)] border border-dashed border-line bg-panel/60 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-tint text-green-800">
          <ArrowLeftRight className="size-4" aria-hidden="true" />
        </span>
        <div>
          <strong className="block text-sm text-ink">{copy.title}</strong>
          <p className="mt-0.5 text-xs text-muted">{copy.text}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          saveMode(other);
          router.push('/dashboard');
          router.refresh();
        }}
      >
        {copy.action}
      </Button>
    </aside>
  );
}
