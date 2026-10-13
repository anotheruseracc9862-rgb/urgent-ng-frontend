'use client';

import { useState } from 'react';
import { formatLagosDateTimeParts, parseLagosDateTime } from '@urgent/utils';

export function LagosDateTimeField({
  id,
  label,
  value,
  onChange,
  hint,
  required,
  error,
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
}

function LagosDateTimeInputs({
  id,
  label,
  value,
  onChange,
  hint,
  required,
  externalError,
}: LagosDateTimeFieldProps & { externalError?: string }) {
  const parts = value ? formatLagosDateTimeParts(value) : null;
  const [date, setDate] = useState(parts?.date ?? '');
  const [time, setTime] = useState(parts?.time ?? '');
  const [parseError, setParseError] = useState<string>();

  const update = (nextDate: string, nextTime: string) => {
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

  return (
    <fieldset className="grid gap-[7px]">
      <legend className="text-[12.5px] font-bold text-ink-2">
        {label}
        {required ? <span aria-hidden="true" className="ml-1 text-red">*</span> : null}
        {required ? <span className="sr-only"> (required)</span> : null}
      </legend>
      {hint ? <p id={hintId} className="text-xs text-muted">{hint}</p> : null}
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <label className="text-xs font-semibold text-muted" htmlFor={dateId}>Date (Lagos)</label>
          <input
            id={dateId}
            type="date"
            value={date}
            onChange={(event) => update(event.target.value, time)}
            aria-describedby={[hint ? hintId : undefined, error ? errorId : undefined].filter(Boolean).join(' ') || undefined}
            aria-invalid={error ? true : undefined}
            className="min-h-11 min-w-0 rounded-[var(--r-sm)] border border-line bg-surface px-3 text-sm text-ink"
          />
        </div>
        <div className="grid gap-1.5">
          <label className="text-xs font-semibold text-muted" htmlFor={timeId}>Time (Lagos)</label>
          <input
            id={timeId}
            type="time"
            value={time}
            onChange={(event) => update(date, event.target.value)}
            aria-describedby={[hint ? hintId : undefined, error ? errorId : undefined].filter(Boolean).join(' ') || undefined}
            aria-invalid={error ? true : undefined}
            className="min-h-11 min-w-0 rounded-[var(--r-sm)] border border-line bg-surface px-3 text-sm text-ink"
          />
        </div>
      </div>
      {error ? <p id={errorId} role="alert" className="text-xs font-semibold text-red">{error}</p> : null}
    </fieldset>
  );
}
