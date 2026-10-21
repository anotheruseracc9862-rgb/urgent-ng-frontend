'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@urgent/ui';

const DAY = 24 * 60;
const DEFAULT_MAX_MINUTES = DAY;

type Preset = { label: string; minutes: number };

/** Up to a day: how long a delivery or a short job takes. */
const SHORT_PRESETS: Preset[] = [
  { label: '30 min', minutes: 30 },
  { label: '1 hr', minutes: 60 },
  { label: '2 hrs', minutes: 120 },
  { label: '3 hrs', minutes: 180 },
  { label: '4 hrs', minutes: 240 },
  { label: '6 hrs', minutes: 360 },
];

/** For a job that may run for days: a service. */
const LONG_PRESETS: Preset[] = [
  { label: '1 hr', minutes: 60 },
  { label: '2 hrs', minutes: 120 },
  { label: '4 hrs', minutes: 240 },
  { label: '1 day', minutes: DAY },
  { label: '2 days', minutes: 2 * DAY },
  { label: '3 days', minutes: 3 * DAY },
  { label: '1 week', minutes: 7 * DAY },
];

/**
 * "45 min", "1 hr 30 min", "2 days", "1 day 4 hrs". From a day up, minutes are left out: nobody quotes
 * three days and fifteen minutes.
 */
export function formatDuration(minutes: number): string {
  if (minutes >= DAY) {
    const days = Math.floor(minutes / DAY);
    const hours = Math.floor((minutes % DAY) / 60);
    return [`${days} ${days === 1 ? 'day' : 'days'}`, hours ? `${hours} ${hours === 1 ? 'hr' : 'hrs'}` : ''].filter(Boolean).join(' ');
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const parts = [hours ? `${hours} ${hours === 1 ? 'hr' : 'hrs'}` : '', rest ? `${rest} min` : ''].filter(Boolean);
  return parts.join(' ') || '0 min';
}

/**
 * A runner's estimate as one line for a requester comparing offers. From a day up it also names the day it
 * would be done by, if chosen now: "2 days · done by Fri 24 Oct" is easier to weigh than a bare length.
 */
export function estimateLabel(minutes: number, now: Date = new Date()): string {
  const length = formatDuration(minutes);
  if (minutes < DAY) return length;
  const day = new Intl.DateTimeFormat('en-NG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' })
    .format(new Date(now.getTime() + minutes * 60_000));
  return `${length} · done by ${day}`;
}

const digitsOnly = (value: string, max: number) => {
  const digits = value.replace(/\D/g, '').slice(0, 3);
  if (digits === '') return '';
  return String(Math.min(Number(digits), max));
};

interface Parts { days: string; hours: string; minutes: string }

/** Short mode has no days field: a day is "24 hrs". Long mode splits into days, hours and minutes. */
function split(total: number | null, long: boolean): Parts {
  if (total === null) return { days: '', hours: '', minutes: '' };
  if (long) {
    const days = Math.floor(total / DAY);
    const hours = Math.floor((total % DAY) / 60);
    const minutes = total % 60;
    return { days: days ? String(days) : '', hours: hours ? String(hours) : '', minutes: minutes || (total < 60 && !days) ? String(minutes) : '' };
  }
  return {
    days: '',
    hours: total >= 60 ? String(Math.floor(total / 60)) : '',
    minutes: total % 60 || total < 60 ? String(total % 60) : '',
  };
}

export interface DurationInputProps {
  id: string;
  /** Total minutes, or null when empty. */
  value: number | null;
  onChange: (minutes: number | null) => void;
  disabled?: boolean;
  describedBy?: string;
  /** The longest the input accepts, in minutes. Beyond a day it offers days; the default is 24 hours. */
  maxMinutes?: number;
}

/** Enter a duration as hours and minutes (and days, when it may be that long), or pick a common length. The value is total minutes. */
export function DurationInput({ id, value, onChange, disabled, describedBy, maxMinutes = DEFAULT_MAX_MINUTES }: DurationInputProps) {
  const long = maxMinutes > DAY;
  const [parts, setParts] = useState<Parts>(() => split(value, long));
  const emitted = useRef<number | null>(value);

  useEffect(() => {
    if (value !== emitted.current) {
      emitted.current = value;
      setParts(split(value, long));
    }
  }, [value, long]);

  const commit = (next: Parts) => {
    const total = Math.min((Number(next.days) || 0) * DAY + (Number(next.hours) || 0) * 60 + (Number(next.minutes) || 0), maxMinutes);
    const result = total > 0 ? total : null;
    emitted.current = result;
    // Typing more than the limit settles on the limit itself, shown the way the field would show it.
    const exceeded = (Number(next.days) || 0) * DAY + (Number(next.hours) || 0) * 60 + (Number(next.minutes) || 0) >= maxMinutes;
    setParts(exceeded ? split(maxMinutes, long) : next);
    onChange(result);
  };

  const field = (name: keyof Parts, suffix: string, label: string, max: number) => (
    <div className="relative">
      <Input
        id={`${id}-${name}`}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={label}
        aria-describedby={describedBy}
        disabled={disabled}
        value={parts[name]}
        placeholder="0"
        onChange={(event) => commit({ ...parts, [name]: digitsOnly(event.target.value, max) })}
        className="pr-12 tabular-nums"
      />
      <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">{suffix}</span>
    </div>
  );

  const presets = (long ? LONG_PRESETS : SHORT_PRESETS).filter((preset) => preset.minutes <= maxMinutes);

  return (
    <div className="grid gap-2" role="group" aria-labelledby={`${id}-label`}>
      <div className={`grid gap-2 ${long ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {long ? field('days', 'day', 'Days', Math.floor(maxMinutes / DAY)) : null}
        {field('hours', 'hr', 'Hours', long ? 23 : Math.floor(maxMinutes / 60))}
        {field('minutes', 'min', 'Minutes', 59)}
      </div>
      <div className="flex flex-wrap gap-1.5" aria-label="Common durations">
        {presets.map((preset) => {
          const active = value === preset.minutes;
          return (
            <button
              key={preset.minutes}
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => commit(split(preset.minutes, long))}
              className={`min-h-8 rounded-full px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 disabled:opacity-50 ${active ? 'bg-green-800 text-white' : 'bg-panel text-ink-2 hover:bg-tint-2'}`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      {value !== null ? <p className="text-xs font-semibold text-green-900">About {formatDuration(value)}</p> : null}
    </div>
  );
}
