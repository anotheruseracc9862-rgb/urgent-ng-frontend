import * as React from 'react';
import Link from 'next/link';

export type StatTone = 'green' | 'amber' | 'blue' | 'violet' | 'red';

const TONE: Record<StatTone, string> = {
  green: 'bg-tint-2 text-green-900',
  amber: 'bg-amber-bg text-amber',
  blue: 'bg-blue-bg text-blue',
  violet: 'bg-violet-bg text-violet',
  red: 'bg-red-bg text-red',
};

const BASE = 'grid content-start gap-3.5 rounded-[var(--r-lg)] bg-surface p-5 text-left shadow-[var(--shadow)] transition-shadow';
const INTERACTIVE = ' hover:shadow-[0_1px_2px_rgba(23,33,46,.04),0_18px_40px_-16px_rgba(23,33,46,.26)]';

/** Demo `.stat`: an icon chip, an optional delta or link, a 32px figure and a label. */
export function Stat({
  value,
  suffix,
  label,
  href,
  onClick,
  icon: Icon,
  tone = 'green',
  badge,
  action,
}: {
  value: string | number;
  /** Muted text after the number, such as "/ 10". */
  suffix?: string;
  label: string;
  href?: string;
  /** Makes the card a button (for example to switch a tab). */
  onClick?: () => void;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  tone?: StatTone;
  badge?: string;
  /** A small link inside the card (for example "Go Pro"). */
  action?: { href: string; label: string };
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className={`grid size-10 place-items-center rounded-[13px] ${TONE[tone]}`}><Icon aria-hidden="true" className="size-5" /></span>
        {badge ? <span className="inline-flex items-center rounded-full bg-ok-bg px-[9px] py-[3px] text-[11px] font-extrabold text-ok">{badge}</span> : null}
        {action ? <Link href={action.href} className="text-xs font-bold text-green-700 hover:underline">{action.label}</Link> : null}
      </div>
      <div>
        <strong className="block text-[32px] font-extrabold leading-none tracking-[-0.04em] tabular-nums text-ink">
          {value}{suffix ? <span className="text-base font-bold text-muted"> {suffix}</span> : null}
        </strong>
        <span className="mt-3.5 block text-[12.5px] font-semibold text-muted">{label}</span>
      </div>
    </>
  );
  if (href) return <Link href={href} className={BASE + INTERACTIVE}>{content}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={BASE + INTERACTIVE}>{content}</button>;
  return <div className={BASE}>{content}</div>;
}
