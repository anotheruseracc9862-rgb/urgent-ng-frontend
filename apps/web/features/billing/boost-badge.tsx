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

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** How long a boost bought now would run, in words: "about 2 hours", "about 1 hour 30 minutes", "about 24 hours". */
export function boostLengthLabel(endsAt: string, now: Date = new Date()): string {
  const minutes = Math.max(1, Math.round((new Date(endsAt).getTime() - now.getTime()) / 60_000));
  if (minutes < 60) return `about ${plural(minutes, 'minute', 'minutes')}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest < 10 || rest > 50) return `about ${plural(rest > 50 ? hours + 1 : hours, 'hour', 'hours')}`;
  return `about ${plural(hours, 'hour', 'hours')} ${plural(Math.round(rest / 5) * 5, 'minute', 'minutes')}`;
}

/** What a running boost has brought so far. Counts only: nobody is named. */
export function BoostResults({ boost, className = '' }: { boost: Boost | null | undefined; className?: string }) {
  if (!boost) return null;
  return (
    <p className={`text-xs leading-relaxed text-muted ${className}`}>
      <span className="font-bold text-ink-2">Since boosting:</span>{' '}
      opened by {plural(boost.openedByCount, 'runner', 'runners')} · {plural(boost.offersSinceCount, 'offer', 'offers')}
    </p>
  );
}
