'use client';

import Image from 'next/image';
import { BadgeCheck, Banknote, MapPinned, PackageCheck, Undo2, UserRound, Zap } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@urgent/ui';
import type { ShellMode } from './nav-items';

interface Point {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}

const COPY: Record<ShellMode, {
  eyebrow: string;
  title: string;
  lead: string;
  points: Point[];
  confirm: string;
  stay: string;
}> = {
  RUNNER: {
    eyebrow: 'Runner mode',
    title: 'Ready to run?',
    lead: 'Pick up errands from people nearby and get paid for getting them done. Same account, new hustle.',
    points: [
      { icon: BadgeCheck, title: 'Verify once', text: 'Confirm your identity one time before you send offers.' },
      { icon: Banknote, title: 'Paid directly', text: 'The requester pays you. Urgent.ng never holds your money.' },
      { icon: Undo2, title: 'Nothing is lost', text: 'Your errands and history stay put. Switch back any time.' },
    ],
    confirm: "Let's run",
    stay: 'Stay as requester',
  },
  REQUESTER: {
    eyebrow: 'Requester mode',
    title: 'Need something done?',
    lead: 'Post an errand and let a verified runner nearby take it off your hands.',
    points: [
      { icon: PackageCheck, title: 'Post in minutes', text: 'Say what you need, where, and what you will pay.' },
      { icon: MapPinned, title: 'Runners nearby', text: 'Compare offers and pick the runner you trust.' },
      { icon: UserRound, title: 'Your runner profile is safe', text: 'Your runner verification and ratings stay as they are.' },
    ],
    confirm: 'Post an errand',
    stay: 'Stay as runner',
  },
};

/** The explainer shown the first time someone switches into a mode. */
export function ModeIntroDialog({ mode, open, onOpenChange, onConfirm }: {
  /** The mode being switched to. */
  mode: ShellMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const copy = COPY[mode];
  const runner = mode === 'RUNNER';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0">
        <div
          className={`relative isolate flex min-h-40 items-end overflow-hidden px-6 pb-5 pt-8 ${
            runner ? 'bg-gradient-to-br from-[#f1fadb] via-[#e4f3b4] to-[#c9e871]' : 'bg-gradient-to-br from-[#eef6ff] via-[#f4fbe6] to-[#dff1a8]'
          }`}
        >
          {runner ? (
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 right-1/3 -z-10">
              {[18, 44, 70].map((top, index) => (
                <span
                  key={top}
                  className="speed-line absolute left-6 h-1 w-24 rounded-full bg-white/80"
                  style={{ top: `${top}%`, animationDelay: `${index * 0.25}s` }}
                />
              ))}
            </div>
          ) : (
            <div aria-hidden="true" className="absolute right-28 top-6 -z-10 grid size-14 place-items-center rounded-2xl bg-white/80 text-green-800 shadow-sm">
              <PackageCheck className="size-7" />
            </div>
          )}
          <div className="min-w-0 flex-1 pr-28">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-green-800">
              <Zap className="size-3" aria-hidden="true" />
              {copy.eyebrow}
            </p>
            <DialogHeader className="mt-2 space-y-1 text-left">
              <DialogTitle className="text-2xl font-extrabold tracking-tight text-ink">{copy.title}</DialogTitle>
              <DialogDescription className="text-sm text-ink-2">{copy.lead}</DialogDescription>
            </DialogHeader>
          </div>
          {runner ? (
            <Image
              src="/assets/mascot-sprint.png"
              alt=""
              width={132}
              height={112}
              priority
              className="mascot-dash absolute bottom-0 right-3 h-24 w-auto drop-shadow-md"
            />
          ) : (
            // Same mascot, framed from the chest up with the raised fist: a greeting, not a sprint.
            <Image
              src="/assets/mascot-bust.png"
              alt=""
              width={150}
              height={114}
              priority
              className="mascot-bob absolute bottom-0 right-3 h-24 w-auto drop-shadow-md"
            />
          )}
        </div>

        <ul className="grid gap-3 px-6 pt-5">
          {copy.points.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-tint text-green-800">
                <Icon className="size-[18px]" />
              </span>
              <span className="text-sm text-ink-2">
                <strong className="block text-ink">{title}</strong>
                {text}
              </span>
            </li>
          ))}
        </ul>

        <DialogFooter className="px-6 pb-6 pt-5">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{copy.stay}</Button>
          <Button type="button" onClick={onConfirm}>{copy.confirm}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
