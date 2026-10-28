'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Package, Truck } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import type { StartMode } from '@/lib/api/types';
import { cn } from '@urgent/ui';
import { saveMode } from '@/lib/auth/mode';
import { AuthHeading, FormError, describeAuthError } from './auth-ui';

const CHOICES: { mode: StartMode; title: string; text: string; icon: typeof Package; chip: string }[] = [
  {
    mode: 'REQUESTER',
    title: 'Get an errand done',
    text: 'Post what you need. Runners send offers.',
    icon: Package,
    chip: 'bg-tint-2 text-green-900',
  },
  {
    mode: 'RUNNER',
    title: 'Run errands and earn',
    text: 'Verify your identity once, then send offers on nearby errands.',
    icon: Truck,
    chip: 'bg-blue-bg text-blue',
  },
];

/**
 * First-run mode choice (F1-07). It saves `startMode` only: both modes stay available and the
 * shell switch changes it later. No permission prompt is shown here. Neither card starts selected:
 * the person picks one.
 */
export function OnboardingFlow() {
  const router = useRouter();
  const [selected, setPicked] = useState<StartMode | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const choose = async (mode: StartMode) => {
    setPicked(mode);
    setBusy(true);
    setError('');
    try {
      await authApi.updateMe({ startMode: mode });
      saveMode(mode);
      router.replace('/dashboard');
      router.refresh();
    } catch (e) {
      setError(describeAuthError(e));
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex gap-1.5" role="img" aria-label="Step 3 of 3">
        <i className="h-[5px] flex-1 rounded-full bg-lime-600" />
        <i className="h-[5px] flex-1 rounded-full bg-lime-600" />
        <i className="h-[5px] flex-1 rounded-full bg-lime-600" />
      </div>

      <AuthHeading title="You are in">What do you want to do first? You can switch any time.</AuthHeading>

      <FormError message={error} />

      <div className="grid gap-3">
        {CHOICES.map(({ mode, title, text, icon: Icon, chip }) => (
          <button
            key={mode}
            type="button"
            disabled={busy}
            onClick={() => void choose(mode)}
            aria-pressed={selected === mode}
            className={cn(
              'flex items-center gap-3.5 rounded-[var(--r)] border-[1.5px] border-line p-[18px] text-left transition-colors',
              'hover:border-lime-600 hover:bg-tint disabled:opacity-60',
              selected === mode && 'border-lime-600 bg-tint',
            )}
          >
            <span className={cn('grid size-11 shrink-0 place-items-center rounded-full', chip)}>
              <Icon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <b className="block text-[15px]">{title}</b>
              <small className="text-muted">{text}</small>
            </span>
            {selected === mode && busy ? <Check className="size-5 text-green-700" /> : null}
          </button>
        ))}
      </div>
    </>
  );
}
