import { Zap } from 'lucide-react';
import type { components } from '@urgent/api-client';

type Boost = components['schemas']['ErrandBoostDto'];

/** When a boost ends, in Lagos time: "today 3:20 pm", or the day and time if it ends on another day. */
export function boostEndsLabel(expiresAt: string, now: Date = new Date()): string {
  const zone = 'Africa/Lagos';
  const end = new Date(expiresAt);
  const day = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: zone }).format(date);
  const time = new Intl.DateTimeFormat('en-NG', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: zone }).format(end);
  if (day(end) === day(now)) return `today ${time}`;
  const tomorrow = new Date(now.getTime() + 86_400_000);
  if (day(end) === day(tomorrow)) return `tomorrow ${time}`;
  return `${new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', timeZone: zone }).format(end)} ${time}`;
}

/** Marks an errand that has a boost running. Nothing renders without one. */
export function BoostBadge({ boost, className = '' }: { boost: Boost | null | undefined; className?: string }) {
  if (!boost) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-violet-bg px-2.5 py-1 text-[11.5px] font-bold text-violet ${className}`}>
      <Zap aria-hidden="true" className="size-3.5" />Boosted<span className="font-semibold opacity-80"> · until {boostEndsLabel(boost.expiresAt)}</span>
    </span>
  );
}
