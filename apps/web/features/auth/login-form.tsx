'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight } from 'lucide-react';
import { Alert, Button, Input, Label } from '@urgent/ui';
import { isValidPhone } from '@urgent/utils';
import { authApi, toIdentifier } from '@/lib/api/auth';
import { isApiError, safeRedirect } from '@/lib/api/client';
import { readPendingIdentifier } from '@/lib/auth/pending-identity';
import { track } from '@/lib/observability';
import { AuthHeading, FieldError, FormError, OrDivider, PasswordInput, describeAuthError } from './auth-ui';
import { GoogleButton } from './google-button';
import { routeAfterLogin } from './after-login';

const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Enter your phone number or email')
    .refine((v) => (v.includes('@') ? z.string().email().safeParse(v).success : isValidPhone(v)), {
      message: 'Enter a valid Nigerian phone number or email',
    }),
  password: z.string().min(1, 'Enter your password'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = safeRedirect(params.get('redirect'));
  const justVerified = params.get('verified') === '1';
  const justReset = params.get('reset') === '1';
  const sessionCheckFailed = params.get('reason') === 'session-check-failed';
  const sessionCheckRequestId = params.get('requestId');

  const [errorMessage, setErrorMessage] = useState('');
  const [locked, setLocked] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  // After verification or reset the identifier is remembered in memory only.
  useEffect(() => {
    const saved = readPendingIdentifier();
    if (saved && (justVerified || justReset)) {
      setValue('identifier', saved);
      setFocus('password');
    }
  }, [justVerified, justReset, setValue, setFocus]);

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage('');
    setLocked(false);
    try {
      const result = await authApi.login({ ...toIdentifier(data.identifier), password: data.password });
      track('auth.login_completed');
      await routeAfterLogin(router, result.status, redirect);
    } catch (error) {
      if (isApiError(error) && error.code === 'ACCOUNT_LOCKED') setLocked(true);
      setErrorMessage(describeAuthError(error));
    }
  };

  return (
    <>
      <div className="flex justify-end text-[13px] text-muted">
        <span>
          New here?&nbsp;
          <Link className="font-bold text-green-700 hover:underline" href="/register">
            Create an account
          </Link>
        </span>
      </div>

      <AuthHeading title="Welcome back">
        Sign in to your workspace. One login for requesting and running errands.
      </AuthHeading>

      {justVerified ? <Alert variant="ok">Your account is verified. Sign in to continue.</Alert> : null}
      {justReset ? <Alert variant="ok">Password changed. Sign in with your new password.</Alert> : null}
      {sessionCheckFailed ? (
        <Alert variant="danger">
          We could not check your session. Sign in again to continue.
          {sessionCheckRequestId ? <span className="ml-1">Reference: {sessionCheckRequestId}</span> : null}
        </Alert>
      ) : null}
      {errorMessage ? <FormError message={errorMessage} /> : null}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        <div>
          <Label htmlFor="identifier">Phone or email</Label>
          <Input
            id="identifier"
            className="mt-1.5"
            autoComplete="username"
            inputMode="email"
            placeholder="0802 345 6789 or you@email.com"
            aria-invalid={!!errors.identifier}
            {...register('identifier')}
          />
          <FieldError message={errors.identifier?.message} />
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            className="mt-1.5"
            autoComplete="current-password"
            placeholder="Your password"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          <FieldError message={errors.password?.message} />
          <div className="mt-1.5 text-right">
            <Link href="/forgot-password" className="text-[12.5px] font-bold text-green-700 hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting || locked}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
          {!isSubmitting && <ArrowRight className="size-[18px]" />}
        </Button>
      </form>

      <OrDivider />
      <GoogleButton redirect={redirect} />
    </>
  );
}
