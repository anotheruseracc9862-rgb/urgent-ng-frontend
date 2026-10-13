'use client';

import type { ReactNode } from 'react';
import { Button, type ButtonProps } from '@urgent/ui';

export function SubmitButton({
  isSubmitting,
  children = 'Submit',
  submittingLabel = 'Saving…',
  disabled,
  ...props
}: ButtonProps & {
  isSubmitting: boolean;
  children?: ReactNode;
  submittingLabel?: string;
}) {
  return (
    <Button type="submit" aria-busy={isSubmitting} disabled={disabled || isSubmitting} {...props}>
      {isSubmitting ? submittingLabel : children}
    </Button>
  );
}
