'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Bell, Check, MessageCircle, Repeat2, ShieldCheck, Star, Tag, Truck, X } from 'lucide-react';
import { cn } from '@urgent/ui';

/** The same icon and tint the notifications page gives each kind of update. */
function appearanceFor(type: string | undefined) {
  const t = type ?? '';
  if (t.startsWith('message.')) return { Icon: MessageCircle, color: 'bg-tint-2 text-green-900' };
  if (t.startsWith('offer.')) return t.includes('counter') ? { Icon: Repeat2, color: 'bg-violet-bg text-violet' } : { Icon: Tag, color: 'bg-amber-bg text-amber' };
  if (t.startsWith('rating.') || t.startsWith('badge.')) return { Icon: Star, color: 'bg-amber-bg text-amber' };
  if (t.startsWith('verification.') || t.startsWith('safety.') || t.startsWith('dispute.')) return { Icon: ShieldCheck, color: 'bg-red-bg text-red' };
  if (t.endsWith('.completed')) return { Icon: Check, color: 'bg-tint-2 text-green-900' };
  if (t.startsWith('execution.') || t.startsWith('assignment.') || t.startsWith('errand.')) return { Icon: Truck, color: 'bg-blue-bg text-blue' };
  return { Icon: Bell, color: 'bg-panel text-ink-2' };
}

function PushToast({ title, body, type, onOpen, onClose }: {
  title: string;
  body: string;
  type?: string;
  onOpen: () => void;
  onClose: () => void;
}) {
  const { Icon, color } = appearanceFor(type);
  return (
    <div
      role="status"
      className="pointer-events-auto grid w-[min(380px,calc(100vw-24px))] grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-3 rounded-[var(--r-lg)] bg-surface p-3.5 shadow-[0_1px_2px_rgba(23,33,46,.04),0_22px_44px_-18px_rgba(23,33,46,.28)] ring-1 ring-line"
    >
      <span aria-hidden="true" className={cn('grid size-10 place-items-center rounded-[13px]', color)}>
        <Icon className="size-[18px]" />
      </span>
      <div className="min-w-0 pt-0.5">
        <strong className="block break-words text-sm font-extrabold leading-snug text-ink">{title}</strong>
        <p className="mt-0.5 line-clamp-2 break-words text-[12.5px] leading-relaxed text-muted">{body}</p>
        <button
          type="button"
          onClick={onOpen}
          className="mt-2.5 inline-flex min-h-9 items-center rounded-full bg-ink px-3.5 text-xs font-bold text-white transition-colors hover:bg-[#0f1822] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
        >
          Open
        </button>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-panel hover:text-ink focus-visible:outline-2 focus-visible:outline-green-700"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

/** A notification card in the app's own style, for pushes that arrive while the app is open. */
export function showPushToast(input: { title: string; body: string; type?: string; onOpen: () => void }): void {
  toast.custom(
    (id) => (
      <PushToast
        title={input.title}
        body={input.body}
        type={input.type}
        onOpen={() => { toast.dismiss(id); input.onOpen(); }}
        onClose={() => toast.dismiss(id)}
      />
    ),
    { duration: 7000 },
  );
}
