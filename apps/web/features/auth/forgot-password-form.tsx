'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { Button, Input, Label } from '@urgent/ui';
import { isValidPhone } from '@urgent/utils';
import { authApi, toIdentifier } from '@/lib/api/auth';
import { setPendingIdentifier } from '@/lib/auth/pending-identity';
import { AuthHeading, FieldError, FormError, describeAuthError } from './auth-ui';

const schema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Enter your phone number or email')
    .refine((v) => (v.includes('@') ? z.string().email().safeParse(v).success : isValidPhone(v)), {
      message: 'Enter a valid Nigerian phone number or email',
    }),
});

type FormData = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ identifier }: FormData) => {
    setErrorMessage('');
    try {
      // The API answers the same whether or not the account exists.
      await authApi.forgot(toIdentifier(identifier));
      setPendingIdentifier(identifier.trim());
      router.push('/reset-password');
    } catch (error) {
      setErrorMessage(describeAuthError(error));
    }
  };

  return (
    <>
      <div>
        <Link href="/login" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Back to sign in
        </Link>
      </div>

      <AuthHeading title="Forgot your password?">
        Enter your phone or email. If an account exists, we send a 6-digit code.
      </AuthHeading>

      <FormError message={errorMessage} />

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        <div>
          <Label htmlFor="identifier">Phone or email</Label>
          <Input
            id="identifier"
            className="mt-1.5"
            autoComplete="username"
            placeholder="0802 345 6789 or you@email.com"
            aria-invalid={!!errors.identifier}
            {...register('identifier')}
          />
          <FieldError message={errors.identifier?.message} />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Sending…' : 'Send code'}
        </Button>
      </form>
    </>
  );
}
