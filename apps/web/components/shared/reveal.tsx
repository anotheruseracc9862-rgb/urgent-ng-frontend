'use client';

import * as React from 'react';
import { cn } from '@urgent/ui';

/** True once the element has scrolled into view. Browsers without IntersectionObserver show it at once. */
function useRevealed<T extends HTMLElement>(threshold: number, rootMargin = '0px') {
  const ref = React.useRef<T>(null);
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      const timer = setTimeout(() => setShown(true), 0);
      return () => clearTimeout(timer);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return [ref, shown] as const;
}

/** Fades and lifts its child into view once. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  /** Stagger in milliseconds. */
  delay?: number;
}) {
  const [ref, shown] = useRevealed<HTMLDivElement>(0.12, '0px 0px -40px 0px');
  return (
    <div
      ref={ref}
      className={cn('reveal', shown && 'is-in', className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/** A `<section>` that reveals itself on scroll. */
export function RevealSection({ children, className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const [ref, shown] = useRevealed<HTMLElement>(0.05);
  return (
    <section ref={ref} className={cn('reveal', shown && 'is-in', className)} {...props}>
      {children}
    </section>
  );
}
