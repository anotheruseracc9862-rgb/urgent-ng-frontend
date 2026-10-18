'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { Button, Input } from '@urgent/ui';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

const monthNames = Array.from({ length: 12 }, (_, month) =>
  new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, month, 1))),
);
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MIN_YEAR = 1900;

function parseDate(value: string): Date | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const local = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const year = Number(iso?.[1] ?? local?.[3]);
  const month = Number(iso?.[2] ?? local?.[2]);
  const day = Number(iso?.[3] ?? local?.[1]);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

function toIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function toDisplay(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function toDateKey(date: Date): number {
  return date.getFullYear() * 10_000 + (date.getMonth() + 1) * 100 + date.getDate();
}

export function DateOfBirthPicker({ value, max, onChange }: {
  value: string;
  max: string;
  onChange: (value: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const parsedValue = parseDate(value);
  const maxDate = parseDate(max);
  const [open, setOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number; maxHeight: number } | null>(null);
  const [draft, setDraft] = useState(parsedValue ? toDisplay(parsedValue) : '');
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initial = parsedValue ?? maxDate ?? new Date();
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });

  const yearOptions = useMemo(() => {
    const latestYear = maxDate?.getFullYear() ?? new Date().getFullYear() - 18;
    return Array.from({ length: latestYear - MIN_YEAR + 1 }, (_, index) => latestYear - index);
  }, [maxDate]);
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const offset = (monthStart.getDay() + 6) % 7;
  const dayCount = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const selectedKey = parsedValue ? toDateKey(parsedValue) : null;
  const maxKey = maxDate ? toDateKey(maxDate) : Number.MAX_SAFE_INTEGER;
  const todayKey = toDateKey(new Date());
  const cells = Array.from({ length: offset + dayCount }, (_, index) => index < offset ? null : index - offset + 1);

  const setDate = (date: Date) => {
    const iso = toIso(date);
    setDraft(toDisplay(date));
    onChange(iso);
    setOpen(false);
    inputRef.current?.setCustomValidity('');
  };

  const toggleCalendar = () => {
    setOpen((current) => {
      const next = !current;
      if (next) {
        setPopoverPosition(null);
        const date = parseDate(draft) ?? maxDate ?? new Date();
        setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
      }
      return next;
    });
  };

  useLayoutEffect(() => {
    if (!open) return;

    const positionPopover = () => {
      const trigger = triggerRef.current;
      const calendar = calendarRef.current;
      if (!trigger || !calendar) return;

      const triggerRect = trigger.getBoundingClientRect();
      const viewportPadding = 12;
      const gap = 8;
      const maxHeight = Math.max(180, window.innerHeight - viewportPadding * 2);
      const panelHeight = Math.min(calendar.scrollHeight, maxHeight);
      const spaceBelow = window.innerHeight - triggerRect.bottom - viewportPadding - gap;
      const spaceAbove = triggerRect.top - viewportPadding - gap;
      const placeBelow = spaceBelow >= Math.min(panelHeight, 320) || spaceBelow >= spaceAbove;
      const top = placeBelow
        ? Math.min(triggerRect.bottom + gap, window.innerHeight - panelHeight - viewportPadding)
        : Math.max(viewportPadding, triggerRect.top - panelHeight - gap);
      const width = calendar.offsetWidth;
      const left = Math.max(viewportPadding, Math.min(triggerRect.left, window.innerWidth - width - viewportPadding));
      setPopoverPosition({ top, left, maxHeight });
    };

    positionPopover();
    window.addEventListener('resize', positionPopover);
    window.addEventListener('scroll', positionPopover, true);
    return () => {
      window.removeEventListener('resize', positionPopover);
      window.removeEventListener('scroll', positionPopover, true);
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

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.currentTarget.value;
    setDraft(next);
    const date = parseDate(next);
    if (!date) {
      onChange('');
      event.currentTarget.setCustomValidity(next ? 'Enter a valid date as DD/MM/YYYY.' : '');
      return;
    }
    if (toDateKey(date) > maxKey) {
      onChange('');
      event.currentTarget.setCustomValidity('You must be at least 18 years old.');
      return;
    }
    onChange(toIso(date));
    event.currentTarget.setCustomValidity('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={rootRef} className="grid gap-1.5 text-sm font-bold text-ink-2">
      <label htmlFor="identity-date-of-birth">Date of birth</label>
      <div className="relative">
        <Input
          ref={inputRef}
          id="identity-date-of-birth"
          required
          value={draft}
          placeholder="DD/MM/YYYY"
          inputMode="numeric"
          autoComplete="bday"
          pattern="(?:\d{2}/\d{2}/\d{4}|\d{4}-\d{2}-\d{2})"
          title="Enter your date as DD/MM/YYYY"
          onChange={handleInputChange}
          className="bg-panel pr-12 font-normal"
        />
        <button
          type="button"
          ref={triggerRef}
          aria-label="Choose date of birth"
          aria-expanded={open}
          aria-controls="date-of-birth-calendar"
          onClick={toggleCalendar}
          onKeyDown={handleKeyDown}
          className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-[var(--r-sm)] text-muted hover:bg-tint hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700"
        >
          <CalendarDays aria-hidden="true" className="size-4" />
        </button>
        {open ? (
          <div
            ref={calendarRef}
            id="date-of-birth-calendar"
            role="dialog"
            aria-label="Choose your date of birth"
            style={{
              position: 'fixed',
              top: popoverPosition?.top ?? 0,
              left: popoverPosition?.left ?? 0,
              maxHeight: popoverPosition?.maxHeight ?? 'calc(100vh - 24px)',
              overflowY: 'auto',
              overflowX: 'hidden',
              visibility: popoverPosition ? 'visible' : 'hidden',
            }}
            className="z-50 grid w-[min(20rem,calc(100vw-3rem))] gap-3 rounded-[var(--r)] border border-line bg-surface p-3 shadow-[var(--shadow-pop)]"
            onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }}
          >
            <div className="flex items-center justify-between gap-2">
              <button type="button" aria-label="Previous month" disabled={visibleMonth.getFullYear() <= MIN_YEAR && visibleMonth.getMonth() === 0} onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))} className="grid size-9 place-items-center rounded-full text-ink hover:bg-panel disabled:opacity-40">
                <ChevronLeft aria-hidden="true" className="size-4" />
              </button>
              <div className="flex min-w-0 items-center gap-1.5">
                <select aria-label="Month" value={visibleMonth.getMonth()} onChange={(event) => setVisibleMonth(new Date(visibleMonth.getFullYear(), Number(event.target.value), 1))} className="min-h-9 min-w-0 rounded-[var(--r-xs)] border border-line bg-white px-2 text-sm font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700">
                  {monthNames.map((month, index) => <option key={month} value={index} disabled={visibleMonth.getFullYear() === maxDate?.getFullYear() && index > (maxDate?.getMonth() ?? 11)}>{month}</option>)}
                </select>
                <select aria-label="Year" value={visibleMonth.getFullYear()} onChange={(event) => setVisibleMonth(new Date(Number(event.target.value), visibleMonth.getMonth(), 1))} className="min-h-9 w-24 rounded-[var(--r-xs)] border border-line bg-white px-2 text-sm font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700">
                  {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
              <button type="button" aria-label="Next month" disabled={visibleMonth.getFullYear() === maxDate?.getFullYear() && visibleMonth.getMonth() >= (maxDate?.getMonth() ?? 11)} onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))} className="grid size-9 place-items-center rounded-full text-ink hover:bg-panel disabled:opacity-40">
                <ChevronRight aria-hidden="true" className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {weekdays.map((day) => <span key={day} className="py-1 text-[11px] font-bold text-muted">{day}</span>)}
              {cells.map((day, index) => {
                if (day === null) return <span key={`empty-${index}`} aria-hidden="true" />;
                const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day);
                const key = toDateKey(date);
                const selected = key === selectedKey;
                return (
                  <button
                    key={day}
                    type="button"
                    aria-label={date.toLocaleDateString('en-GB')}
                    aria-pressed={selected}
                    disabled={key > maxKey}
                    onClick={() => setDate(date)}
                    className={`grid aspect-square place-items-center rounded-full text-sm transition-colors hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 disabled:pointer-events-none disabled:text-faint/50 ${selected ? 'bg-green-700 font-extrabold text-white hover:bg-green-700' : key === todayKey ? 'font-extrabold text-green-900' : 'text-ink'}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end border-t border-line-2 pt-2">
              <Button type="button" variant="ghost" size="sm" disabled={!value} onClick={() => { setDraft(''); onChange(''); inputRef.current?.setCustomValidity(''); }}>
                Clear date
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
