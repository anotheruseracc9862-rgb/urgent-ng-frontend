'use client';

import type { ReactElement, ReactNode } from 'react';
import {
  useController,
  type Control,
  type ControllerFieldState,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import { Field } from '@urgent/ui';

export function ControlledField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  hint,
  required,
  id = String(name).replaceAll('.', '-'),
  renderInput,
}: {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: ReactNode;
  hint?: string;
  required?: boolean;
  id?: string;
  renderInput: (
    field: ControllerRenderProps<TFieldValues, FieldPath<TFieldValues>>,
    state: ControllerFieldState,
  ) => ReactElement;
}) {
  const { field, fieldState } = useController({ control, name });

  return (
    <Field id={id} label={label} hint={hint} error={fieldState.error?.message} required={required}>
      {renderInput(field, fieldState)}
    </Field>
  );
}
