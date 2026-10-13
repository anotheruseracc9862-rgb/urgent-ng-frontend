import * as React from 'react';
import { cn } from '@urgent/ui';

/**
 * Scroll reveal without client JavaScript: `.reveal` uses a CSS scroll-driven animation
 * (see `globals.css`). Browsers without `animation-timeline` show the content at once.
 */
export function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('reveal', className)}>{children}</div>;
}

/** A `<section>` that reveals itself on scroll. */
export function RevealSection({ children, className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn('reveal', className)} {...props}>
      {children}
    </section>
  );
}
