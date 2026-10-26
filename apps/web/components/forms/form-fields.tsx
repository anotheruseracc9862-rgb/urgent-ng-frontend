'use client';

import { Input, MoneyInput, PhoneInput } from '@urgent/ui';
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { ControlledField } from './controlled-field';
import { LagosDateTimeField } from './lagos-date-time-field';

interface ControlledInputProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  hint?: string;
  required?: boolean;
  id?: string;
}

export function TextFormField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  hint,
  required,
  id,
}: ControlledInputProps<TFieldValues>) {
  return (
    <ControlledField
      control={control}
      name={name}
      label={label}
      hint={hint}
      required={required}
      id={id}
      renderInput={(field) => (
        <Input
          ref={field.ref}
          name={field.name}
          value={typeof field.value === 'string' ? field.value : ''}
          onChange={field.onChange}
          onBlur={field.onBlur}
        />
      )}
    />
  );
}

export function MoneyFormField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  hint,
  required,
  id,
}: ControlledInputProps<TFieldValues>) {
  return (
    <ControlledField
      control={control}
      name={name}
      label={label}
      hint={hint}
      required={required}
      id={id}
      renderInput={(field) => (
        <MoneyInput
          ref={field.ref}
          name={field.name}
          value={typeof field.value === 'number' ? field.value : null}
          onChange={field.onChange}
          onBlur={field.onBlur}
        />
      )}
    />
  );
}

export function PhoneFormField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  hint,
  required,
  id,
}: ControlledInputProps<TFieldValues>) {
  return (
    <ControlledField
      control={control}
      name={name}
      label={label}
      hint={hint}
      required={required}
      id={id}
      renderInput={(field) => (
        <PhoneInput
          ref={field.ref}
          name={field.name}
          value={typeof field.value === 'string' ? field.value : ''}
          onChange={field.onChange}
          onBlur={field.onBlur}
        />
      )}
    />
  );
}

export function LagosDateTimeFormField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  hint,
  required,
  id = String(name).replaceAll('.', '-'),
}: ControlledInputProps<TFieldValues>) {
  const { field, fieldState } = useController({ control, name });
  return (
    <LagosDateTimeField
      id={id}
      label={label}
      hint={hint}
      required={required}
      value={typeof field.value === 'string' ? field.value : null}
      onChange={field.onChange}
      error={fieldState.error?.message}
    />
  );
}
