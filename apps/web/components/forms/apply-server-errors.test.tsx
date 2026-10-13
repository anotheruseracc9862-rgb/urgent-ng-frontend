import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiError } from '@urgent/api-client';
import { useForm } from 'react-hook-form';
import { applyServerErrors } from './apply-server-errors';

interface TestForm {
  name: string;
  identity: { dateOfBirth: string };
}

describe('applyServerErrors()', () => {
  it('maps backend dot paths to matching form fields', () => {
    const { result } = renderHook(() =>
      useForm<TestForm>({ defaultValues: { name: '', identity: { dateOfBirth: '' } } }),
    );
    const error = new ApiError(400, 'VALIDATION_ERROR', 'The date is invalid.', { field: 'identity.dateOfBirth' });

    expect(applyServerErrors(result.current, error)).toBeUndefined();
    expect(result.current.getFieldState('identity.dateOfBirth').error?.message).toBe('The date is invalid.');
  });

  it('puts unknown fields and non-validation API errors at the form root', () => {
    const { result } = renderHook(() =>
      useForm<TestForm>({ defaultValues: { name: '', identity: { dateOfBirth: '' } } }),
    );

    expect(
      applyServerErrors(
        result.current,
        new ApiError(400, 'VALIDATION_ERROR', 'Invalid field.', { field: 'unknown.path' }),
      ),
    ).toBe('Invalid field.');
    expect(result.current.getFieldState('root.server').error?.message).toBe('Invalid field.');

    expect(applyServerErrors(result.current, new ApiError(503, 'SERVER_ERROR', 'Try again later.'))).toBe(
      'Try again later.',
    );
    expect(result.current.getFieldState('root.server').error?.message).toBe('Try again later.');
  });
});
