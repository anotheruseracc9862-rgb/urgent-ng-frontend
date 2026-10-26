'use client';

import * as React from 'react';
import { ChevronDown, Info } from 'lucide-react';

const WIDE = '(min-width: 1024px)';
const query = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(WIDE) : null);

function subscribe(notify: () => void) {
  const list = query();
  list?.addEventListener('change', notify);
  return () => list?.removeEventListener('change', notify);
}

/**
 * Reading material that sits beside a form: tips, what is shared with whom. On a phone it is folded
 * behind one line, so a stack of tinted boxes is not mistaken for more fields to fill in. From the
 * `lg` breakpoint, where it sits in the side column, it is open and the line is hidden.
 */
export function InfoDisclosure({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  // Closed for the server and the first paint, then open on a wide screen, following a resize.
  const wide = React.useSyncExternalStore(subscribe, () => query()?.matches ?? false, () => false);

  return (
    <details open={wide || undefined} className={`group min-w-0 ${className}`}>
      <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 rounded-full px-1 text-sm font-bold text-green-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 lg:hidden [&::-webkit-details-marker]:hidden">
        <Info aria-hidden="true" className="size-4 shrink-0" />
        {title}
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="grid gap-4 max-lg:mt-1 max-lg:border-l-2 max-lg:border-lime-600 max-lg:pl-3 max-lg:[&>section]:bg-transparent max-lg:[&>section]:p-0 max-lg:[&>section]:shadow-none">
        {children}
      </div>
    </details>
  );
}

/** A short plain note with an icon. No box or tint, so it does not read as a field. */
export function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-green-800" />
      <span>{children}</span>
    </p>
  );
}
