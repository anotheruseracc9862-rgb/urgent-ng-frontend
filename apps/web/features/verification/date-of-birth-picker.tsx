'use client';

import { DatePicker } from '@/components/forms/date-picker';

export function DateOfBirthPicker({ value, max, onChange }: {
  value: string;
  max: string;
  onChange: (value: string) => void;
}) {
  return (
    <DatePicker
      id="identity-date-of-birth"
      className="grid gap-1.5 text-sm font-bold text-ink-2"
      label="Date of birth"
      value={value}
      max={max}
      min="1900-01-01"
      maxMessage="You must be at least 18 years old."
      minMessage="Enter a valid date of birth."
      triggerLabel="Choose date of birth"
      dialogLabel="Choose your date of birth"
      autoComplete="bday"
      required
      onChange={onChange}
    />
  );
}
