'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@urgent/ui';

const MAX_MINUTES = 24 * 60;
const PRESETS = [
  { label: '30 min', minutes: 30 },
  { label: '1 hr', minutes: 60 },
  { label: '2 hrs', minutes: 120 },
  { label: '3 hrs', minutes: 180 },
  { label: '4 hrs', minutes: 240 },
  { label: '6 hrs', minutes: 360 },
] as const;

/** "1 hr 30 min", "45 min", "2 hrs". */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const parts = [hours ? `${hours} ${hours === 1 ? 'hr' : 'hrs'}` : '', rest ? `${rest} min` : ''].filter(Boolean);
  return parts.join(' ') || '0 min';
}

const digitsOnly = (value: string, max: number) => {
  const digits = value.replace(/\D/g, '').slice(0, 3);
  if (digits === '') return '';
  return String(Math.min(Number(digits), max));
};

const split = (total: number | null) => total === null ? { hours: '', minutes: '' } : {
  hours: total >= 60 ? String(Math.floor(total / 60)) : '',
  minutes: total % 60 || total < 60 ? String(total % 60) : '',
};

export interface DurationInputProps {
  id: string;
  /** Total minutes, or null when empty. */
  value: number | null;
  onChange: (minutes: number | null) => void;
  disabled?: boolean;
  describedBy?: string;
}

/** Enter a duration as hours and minutes, or pick a common length. The value is total minutes. */
export function DurationInput({ id, value, onChange, disabled, describedBy }: DurationInputProps) {
  const [{ hours, minutes }, setParts] = useState(() => split(value));
  const emitted = useRef<number | null>(value);

  useEffect(() => {
    if (value !== emitted.current) {
      emitted.current = value;
      setParts(split(value));
    }
  }, [value]);

  const commit = (nextHours: string, nextMinutes: string) => {
    const total = Math.min((Number(nextHours) || 0) * 60 + (Number(nextMinutes) || 0), MAX_MINUTES);
    const next = total > 0 ? total : null;
    emitted.current = next;
    if (total === MAX_MINUTES) {
      setParts({ hours: '24', minutes: '' });
    } else {
      setParts({ hours: nextHours, minutes: nextMinutes });
    }
    onChange(next);
  };

  const field = (name: 'hours' | 'minutes', fieldValue: string, max: number, suffix: string, label: string) => (
    <div className="relative">
      <Input
        id={name === 'hours' ? `${id}-hours` : `${id}-minutes`}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={label}
        aria-describedby={describedBy}
        disabled={disabled}
        value={fieldValue}
        placeholder="0"
        onChange={(event) => {
          const next = digitsOnly(event.target.value, max);
          commit(name === 'hours' ? next : hours, name === 'minutes' ? next : minutes);
        }}
        className="pr-12 tabular-nums"
      />
      <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">{suffix}</span>
    </div>
  );

  return (
    <div className="grid gap-2" role="group" aria-labelledby={`${id}-label`}>
      <div className="grid grid-cols-2 gap-2">
        {field('hours', hours, 24, 'hr', 'Hours')}
        {field('minutes', minutes, 59, 'min', 'Minutes')}
      </div>
      <div className="flex flex-wrap gap-1.5" aria-label="Common durations">
        {PRESETS.map((preset) => {
          const active = value === preset.minutes;
          return (
            <button
              key={preset.minutes}
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => commit(String(Math.floor(preset.minutes / 60) || ''), String(preset.minutes % 60 || ''))}
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
