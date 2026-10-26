import { isApiError } from '@urgent/api-client';
import type { FieldPath, FieldValues, UseFormReturn } from 'react-hook-form';

type ErrorForm<TFieldValues extends FieldValues> = Pick<
  UseFormReturn<TFieldValues>,
  'getValues' | 'setError'
>;

function hasFieldPath(values: unknown, fieldPath: string): boolean {
  let current = values;
  for (const part of fieldPath.split('.')) {
    if (!current || typeof current !== 'object' || !(part in current)) return false;
    current = (current as Record<string, unknown>)[part];
  }
  return true;
}

/** Maps backend dot-path validation errors onto registered form values. */
export function applyServerErrors<TFieldValues extends FieldValues>(
  form: ErrorForm<TFieldValues>,
  error: unknown,
): string | undefined {
  const message = isApiError(error) ? error.message : 'Something went wrong. Please try again.';
  if (!isApiError(error) || error.code !== 'VALIDATION_ERROR') {
    form.setError('root.server', { type: 'server', message });
    return message;
  }

  const path = error.details.field;
  if (typeof path === 'string' && hasFieldPath(form.getValues(), path)) {
    form.setError(path as FieldPath<TFieldValues>, { type: 'server', message });
    return undefined;
  }

  form.setError('root.server', { type: 'server', message });
  return message;
}
