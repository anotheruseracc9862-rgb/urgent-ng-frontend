'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { Button, Input } from '@urgent/ui';
import { Clock } from 'lucide-react';

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const MINUTE_STEP = 5;
const MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, index) => index * MINUTE_STEP);

const pad = (value: number) => String(value).padStart(2, '0');

/** Parse `HH:mm` (24-hour) into total minutes since midnight. */
export function parseTime(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour > 23 || minute > 59 ? null : hour * 60 + minute;
}

function toTime(total: number): string {
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

export interface TimePickerProps {
  id: string;
  /** `HH:mm` (24-hour), or empty. */
  value: string;
  onChange: (value: string) => void;
  /** Earliest selectable time, `HH:mm`. */
  min?: string;
  /** Latest selectable time, `HH:mm`. */
  max?: string;
  label?: string;
  labelClassName?: string;
  className?: string;
  triggerLabel?: string;
  dialogLabel?: string;
  minMessage?: string;
  maxMessage?: string;
  placeholder?: string;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
}

export function TimePicker({
  id,
  value,
  onChange,
  min,
  max,
  label,
  labelClassName,
  className = 'grid gap-1.5',
  triggerLabel = 'Choose time',
  dialogLabel = 'Choose a time',
  minMessage = 'This time is too early.',
  maxMessage = 'This time is too late.',
  placeholder = 'HH:MM',
  required,
  invalid,
  describedBy,
  disabled,
}: TimePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const parsedValue = parseTime(value);
  const minTotal = min ? parseTime(min) ?? 0 : 0;
  const maxTotal = max ? parseTime(max) ?? 23 * 60 + 59 : 23 * 60 + 59;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(parsedValue === null ? '' : toTime(parsedValue));
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [pendingHour, setPendingHour] = useState<number | null>(null);

  const selectedHour = pendingHour ?? (parsedValue === null ? null : Math.floor(parsedValue / 60));
  const selectedMinute = parsedValue === null ? null : parsedValue % 60;
  const inRange = (total: number) => total >= minTotal && total <= maxTotal;
  const hourDisabled = (hour: number) => !MINUTES.some((minute) => inRange(hour * 60 + minute));
  const minuteDisabled = (minute: number) => selectedHour === null || !inRange(selectedHour * 60 + minute);

  const commit = (total: number) => {
    setDraft(toTime(total));
    onChange(toTime(total));
    inputRef.current?.setCustomValidity('');
  };

  const chooseHour = (hour: number) => {
    setPendingHour(hour);
    const firstMinute = MINUTES.find((minute) => inRange(hour * 60 + minute));
    const keep = selectedMinute !== null && inRange(hour * 60 + selectedMinute) ? selectedMinute : firstMinute;
    if (keep !== undefined) commit(hour * 60 + keep);
  };

  const chooseMinute = (minute: number) => {
    if (selectedHour === null) return;
    commit(selectedHour * 60 + minute);
    setOpen(false);
  };

  const toggle = () => {
    setOpen((current) => {
      if (!current) {
        setPosition(null);
        setPendingHour(null);
      }
      return !current;
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (!trigger || !panel) return;
      const rect = trigger.getBoundingClientRect();
      const padding = 12;
      const gap = 8;
      const height = panel.offsetHeight;
      const width = panel.offsetWidth;
      const below = window.innerHeight - rect.bottom - padding - gap;
      const above = rect.top - padding - gap;
      const placeBelow = below >= height || below >= above;
      const top = placeBelow
        ? Math.max(padding, Math.min(rect.bottom + gap, window.innerHeight - height - padding))
        : Math.max(padding, rect.top - height - gap);
      const left = Math.max(padding, Math.min(rect.right - width, window.innerWidth - width - padding));
      setPosition({ top, left });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [open]);

  useEffect(() => {
    if (!open || !position) return;
    panelRef.current?.querySelectorAll<HTMLElement>('[aria-pressed="true"]').forEach((node) => node.scrollIntoView({ block: 'center' }));
  }, [open, position]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.currentTarget.value;
    setDraft(next);
    const total = parseTime(next);
    if (total === null) {
      onChange('');
      event.currentTarget.setCustomValidity(next ? 'Enter a valid time as HH:MM (24-hour).' : '');
      return;
    }
    if (total < minTotal) {
      onChange('');
      event.currentTarget.setCustomValidity(minMessage);
      return;
    }
    if (total > maxTotal) {
      onChange('');
      event.currentTarget.setCustomValidity(maxMessage);
      return;
    }
    onChange(toTime(total));
    event.currentTarget.setCustomValidity('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') setOpen(false);
  };

  const panelId = `${id}-panel`;
  const optionClass = (selected: boolean) => `grid h-9 w-full place-items-center rounded-[var(--r-xs)] text-sm tabular-nums transition-colors hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 disabled:pointer-events-none disabled:text-faint/50 ${selected ? 'bg-green-700 font-extrabold text-white hover:bg-green-700' : 'text-ink'}`;

  return (
    <div ref={rootRef} className={className}>
      {label ? <label htmlFor={id} className={labelClassName}>{label}</label> : null}
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          required={required}
          disabled={disabled}
          value={draft}
          placeholder={placeholder}
          inputMode="numeric"
          pattern="\d{1,2}:\d{2}"
          title="Enter the time as HH:MM (24-hour)"
          aria-describedby={describedBy}
          aria-invalid={invalid ? true : undefined}
          onChange={handleInputChange}
          className="bg-panel pr-12 font-normal"
        />
        <button
          type="button"
          ref={triggerRef}
          aria-label={triggerLabel}
          disabled={disabled}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={toggle}
          onKeyDown={handleKeyDown}
          className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-[var(--r-sm)] text-muted hover:bg-tint hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700"
        >
          <Clock aria-hidden="true" className="size-4" />
        </button>
        {open ? (
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={dialogLabel}
            style={{ position: 'fixed', top: position?.top ?? 0, left: position?.left ?? 0, visibility: position ? 'visible' : 'hidden' }}
            className="z-50 grid w-56 gap-2 rounded-[var(--r)] border border-line bg-surface p-3 shadow-[var(--shadow-pop)]"
            onKeyDown={handleKeyDown}
          >
            <div className="grid grid-cols-2 gap-2">
              <p className="text-center text-[11px] font-bold text-muted">Hour</p>
              <p className="text-center text-[11px] font-bold text-muted">Minute</p>
              <div role="group" aria-label="Hour" className="grid max-h-52 content-start gap-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {HOURS.map((hour) => (
                  <button key={hour} type="button" aria-label={`${pad(hour)} hours`} aria-pressed={hour === selectedHour} disabled={hourDisabled(hour)} onClick={() => chooseHour(hour)} className={optionClass(hour === selectedHour)}>{pad(hour)}</button>
                ))}
              </div>
              <div role="group" aria-label="Minute" className="grid max-h-52 content-start gap-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {MINUTES.map((minute) => (
                  <button key={minute} type="button" aria-label={`${pad(minute)} minutes`} aria-pressed={selectedHour !== null && minute === selectedMinute} disabled={minuteDisabled(minute)} onClick={() => chooseMinute(minute)} className={optionClass(selectedHour !== null && minute === selectedMinute)}>{pad(minute)}</button>
                ))}
              </div>
            </div>
            <div className="flex justify-end border-t border-line-2 pt-2">
              <Button type="button" variant="ghost" size="sm" disabled={!value} onClick={() => { setDraft(''); setPendingHour(null); onChange(''); inputRef.current?.setCustomValidity(''); }}>
                Clear time
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
