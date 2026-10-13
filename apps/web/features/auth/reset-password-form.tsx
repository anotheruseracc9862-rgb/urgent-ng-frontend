'use client';

import { useEffect, useState } from 'react';
import { setPendingIdentifier } from '@/lib/auth/pending-identity';
import { usePendingIdentifier } from '@/lib/auth/use-pending-identity';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Label } from '@urgent/ui';
import { isValidPhone } from '@urgent/utils';
import { authApi, toIdentifier } from '@/lib/api/auth';
import { AuthHeading, FieldError, FormError, OtpBoxes, PasswordInput, describeAuthError } from './auth-ui';

const schema = z
  .object({
    identifier: z
      .string()
      .trim()
      .min(1, 'Enter your phone number or email')
      .refine((v) => (v.includes('@') ? z.string().email().safeParse(v).success : isValidPhone(v)), {
        message: 'Enter a valid Nigerian phone number or email',
      }),
    code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
    password: z.string().min(8, 'Use at least 8 characters').max(128),
    confirmPassword: z.string().min(1, 'Repeat your password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState('');
  const saved = usePendingIdentifier();
  const needsIdentifier = saved === null;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: '', code: '' },
  });

  useEffect(() => {
    if (saved) setValue('identifier', saved);
  }, [saved, setValue]);

  const onSubmit = async (data: FormData) => {
    setErrorMessage('');
    try {
      await authApi.reset({ ...toIdentifier(data.identifier), code: data.code, newPassword: data.password });
      setPendingIdentifier(data.identifier.trim());
      router.replace('/login?reset=1');
    } catch (error) {
      setErrorMessage(describeAuthError(error));
    }
  };

  return (
    <>
      <AuthHeading title="Set a new password">
        Enter the 6-digit code we sent, then choose a new password. Other devices are signed out.
      </AuthHeading>

      <FormError message={errorMessage} />

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        {needsIdentifier ? (
          <div>
            <Label htmlFor="identifier">Phone or email</Label>
            <Input
              id="identifier"
              className="mt-1.5"
              autoComplete="username"
              aria-invalid={!!errors.identifier}
              {...register('identifier')}
            />
            <FieldError message={errors.identifier?.message} />
          </div>
        ) : null}

        <div>
          <Label>Code</Label>
          <div className="mt-1.5">
            <Controller
              control={control}
              name="code"
              render={({ field }) => (
                <OtpBoxes value={field.value} onChange={field.onChange} invalid={!!errors.code} />
              )}
            />
          </div>
          <FieldError message={errors.code?.message} />
        </div>

        <div>
          <Label htmlFor="password">New password</Label>
          <PasswordInput
            id="password"
            className="mt-1.5"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          <FieldError message={errors.password?.message} />
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <PasswordInput
            id="confirmPassword"
            className="mt-1.5"
            autoComplete="new-password"
            placeholder="Repeat password"
            aria-invalid={!!errors.confirmPassword}
            {...register('confirmPassword')}
          />
          <FieldError message={errors.confirmPassword?.message} />
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Change password'}
        </Button>
      </form>

      <p className="text-center text-[13px] text-muted">
        No code?{' '}
        <Link href="/forgot-password" className="font-bold text-green-700 hover:underline">
          Send a new one
        </Link>
      </p>
    </>
  );
}
