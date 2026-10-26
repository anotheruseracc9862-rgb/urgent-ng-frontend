'use client';

import { useState } from 'react';
import { formatLagosDateTimeParts, parseLagosDateTime } from '@urgent/utils';
import { DatePicker } from './date-picker';
import { TimePicker, parseTime } from './time-picker';

const TIME_STEP_MINUTES = 5;
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export function LagosDateTimeField({
  id,
  label,
  value,
  onChange,
  hint,
  required,
  error,
  minLeadMinutes = 0,
  maxDaysAhead,
}: LagosDateTimeFieldProps) {
  return (
    <LagosDateTimeInputs
      key={value ?? '__empty'}
      id={id}
      label={label}
      value={value}
      onChange={onChange}
      hint={hint}
      required={required}
      externalError={error}
      minLeadMinutes={minLeadMinutes}
      maxDaysAhead={maxDaysAhead}
    />
  );
}

interface LagosDateTimeFieldProps {
  id: string;
  label: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  hint?: string;
  required?: boolean;
  error?: string;
  /** Earliest selectable moment, in minutes from now. Defaults to 0, so past times are blocked. */
  minLeadMinutes?: number;
  /** Latest selectable moment, in days from now. Unlimited when omitted. */
  maxDaysAhead?: number;
}

interface Bounds {
  minDate: string;
  /** Earliest time on `minDate`, `HH:mm`. */
  minTime: string;
  maxDate?: string;
  /** Latest time on `maxDate`, `HH:mm`. */
  maxTime?: string;
}

function lagosParts(ms: number) {
  return formatLagosDateTimeParts(new Date(ms).toISOString()) ?? { date: '', time: '00:00' };
}

function nextDay(date: string) {
  return new Date(Date.parse(`${date}T00:00:00.000Z`) + DAY_MS).toISOString().slice(0, 10);
}

function computeBounds(minLeadMinutes: number, maxDaysAhead?: number): Bounds {
  const now = Date.now();
  const earliest = lagosParts(now + minLeadMinutes * MINUTE_MS);
  const rounded = Math.ceil((parseTime(earliest.time) ?? 0) / TIME_STEP_MINUTES) * TIME_STEP_MINUTES;
  const roundsIntoNextDay = rounded >= 24 * 60;
  const bounds: Bounds = {
    minDate: roundsIntoNextDay ? nextDay(earliest.date) : earliest.date,
    minTime: roundsIntoNextDay ? '00:00' : `${String(Math.floor(rounded / 60)).padStart(2, '0')}:${String(rounded % 60).padStart(2, '0')}`,
  };
  if (maxDaysAhead !== undefined) {
    const latest = lagosParts(now + maxDaysAhead * DAY_MS);
    bounds.maxDate = latest.date;
    bounds.maxTime = latest.time;
  }
  return bounds;
}

function timeLimitsFor(date: string, bounds: Bounds) {
  return {
    min: date && date === bounds.minDate ? bounds.minTime : undefined,
    max: date && date === bounds.maxDate ? bounds.maxTime : undefined,
  };
}

function LagosDateTimeInputs({
  id,
  label,
  value,
  onChange,
  hint,
  required,
  externalError,
  minLeadMinutes = 0,
  maxDaysAhead,
}: LagosDateTimeFieldProps & { externalError?: string }) {
  const parts = value ? formatLagosDateTimeParts(value) : null;
  const [date, setDate] = useState(parts?.date ?? '');
  const [time, setTime] = useState(parts?.time ?? '');
  const [parseError, setParseError] = useState<string>();
  const bounds = computeBounds(minLeadMinutes, maxDaysAhead);

  const update = (nextDate: string, nextTime: string) => {
    const limits = timeLimitsFor(nextDate, bounds);
    const total = parseTime(nextTime);
    if (total !== null && ((limits.min && total < (parseTime(limits.min) ?? 0)) || (limits.max && total > (parseTime(limits.max) ?? 0)))) {
      nextTime = '';
    }
    setDate(nextDate);
    setTime(nextTime);
    setParseError(undefined);
    if (!nextDate || !nextTime) {
      onChange(null);
      return;
    }

    try {
      onChange(parseLagosDateTime(nextDate, nextTime));
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      setParseError(error.message);
      onChange(null);
    }
  };

  const error = parseError ?? externalError;
  const dateId = `${id}-date`;
  const timeId = `${id}-time`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : undefined, error ? errorId : undefined].filter(Boolean).join(' ') || undefined;
  const timeLimits = timeLimitsFor(date, bounds);
  const labelClassName = 'text-xs font-semibold text-muted';

  return (
    <fieldset className="grid gap-[7px]">
      <legend className="text-[12.5px] font-bold text-ink-2">
        {label}
        {required ? <span aria-hidden="true" className="ml-1 text-red">*</span> : null}
        {required ? <span className="sr-only"> (required)</span> : null}
      </legend>
      {hint ? <p id={hintId} className="text-xs text-muted">{hint}</p> : null}
      <div className="grid grid-cols-2 gap-3">
        <DatePicker
          id={dateId}
          label="Date"
          labelClassName={labelClassName}
          value={date}
          min={bounds.minDate}
          max={bounds.maxDate}
          minMessage="This date has already passed."
          maxMessage="This date is too far ahead."
          triggerLabel="Choose date"
          dialogLabel="Choose a date"
          showClear={false}
          invalid={Boolean(error)}
          describedBy={describedBy}
          onChange={(next) => update(next, time)}
        />
        <TimePicker
          key={`${timeId}-${date}`}
          id={timeId}
          label="Time"
          labelClassName={labelClassName}
          value={time}
          min={timeLimits.min}
          max={timeLimits.max}
          minMessage="This time has already passed."
          maxMessage="This time is too far ahead."
          triggerLabel="Choose time"
          dialogLabel="Choose a time"
          invalid={Boolean(error)}
          describedBy={describedBy}
          onChange={(next) => update(date, next)}
        />
      </div>
      {error ? <p id={errorId} role="alert" className="text-xs font-semibold text-red">{error}</p> : null}
    </fieldset>
  );
}
