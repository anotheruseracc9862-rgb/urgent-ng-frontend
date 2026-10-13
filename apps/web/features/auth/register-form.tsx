'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight } from 'lucide-react';
import { Button, Input, Label } from '@urgent/ui';
import { isValidPhone, normalizePhone } from '@urgent/utils';
import { authApi } from '@/lib/api/auth';
import { REQUIRED_CONSENTS } from '@/lib/api/types';
import { setPendingVerify } from '@/lib/auth/pending-identity';
import { track } from '@/lib/observability';
import { AuthHeading, FieldError, FormError, OrDivider, PasswordInput, describeAuthError } from './auth-ui';
import { GoogleButton } from './google-button';

const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter your full name').max(100),
    phone: z.string().trim().optional(),
    email: z.string().trim().optional(),
    password: z.string().min(8, 'Use at least 8 characters').max(128),
    confirmPassword: z.string().min(1, 'Repeat your password'),
    agreed: z.boolean().refine((v) => v, 'You need to agree to continue'),
  })
  .superRefine((data, ctx) => {
    if (!data.phone && !data.email) {
      ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Enter a phone number or an email' });
    }
    if (data.phone && !isValidPhone(data.phone)) {
      ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Enter a valid Nigerian phone number' });
    }
    if (data.email && !z.string().email().safeParse(data.email).success) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: 'Enter a valid email address' });
    }
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords do not match' });
    }
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = params.get('mode') === 'runner' ? 'RUNNER' : 'REQUESTER';
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { agreed: false },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setErrorMessage('');
    try {
      const published = await authApi.policies();
      const consents = REQUIRED_CONSENTS.map((type) => {
        const policy = published.find((p) => p.type === type);
        return policy ? { type, version: policy.version } : null;
      });
      if (consents.some((c) => c === null)) {
        setErrorMessage('Sign-up is not available right now. Please try again shortly.');
        return;
      }

      const phone = data.phone ? (normalizePhone(data.phone) ?? data.phone) : undefined;
      const email = data.email ? data.email.toLowerCase() : undefined;

      const result = await authApi.register({
        name: data.name,
        password: data.password,
        ...(phone ? { phone } : {}),
        ...(email ? { email } : {}),
        consents: consents as { type: (typeof REQUIRED_CONSENTS)[number]; version: string }[],
      } as Parameters<typeof authApi.register>[0]);

      // Context for the next screen. Never put it in the URL; never store the password.
      setPendingVerify({ via: result.verifyVia, phone, email });
      sessionStorage.setItem('urgent.intent', mode);
      track('auth.register_completed');
      router.push('/verify');
    } catch (error) {
      setErrorMessage(describeAuthError(error));
    }
  };

  return (
    <>
      <div className="flex justify-end text-[13px] text-muted">
        <span>
          Have an account?&nbsp;
          <Link className="font-bold text-green-700 hover:underline" href="/login">
            Sign in
          </Link>
        </span>
      </div>

      <div className="flex gap-1.5" aria-label="Step 1 of 3">
        <i className="h-[5px] flex-1 rounded-full bg-lime-600" />
        <i className="h-[5px] flex-1 rounded-full bg-line" />
        <i className="h-[5px] flex-1 rounded-full bg-line" />
      </div>

      <AuthHeading title="Create your account">
        It takes about a minute.{' '}
        {mode === 'RUNNER'
          ? 'You will verify your identity before you can send offers.'
          : 'You can run errands and request them with the same account.'}
      </AuthHeading>

      <FormError message={errorMessage} />

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            className="mt-1.5"
            autoComplete="name"
            placeholder="As on your ID"
            aria-invalid={!!errors.name}
            {...register('name')}
          />
          <FieldError message={errors.name?.message} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              className="mt-1.5"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0803 123 4567"
              aria-invalid={!!errors.phone}
              {...register('phone')}
            />
            <FieldError message={errors.phone?.message} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              className="mt-1.5"
              autoComplete="email"
              placeholder="you@email.com"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            <FieldError message={errors.email?.message} />
          </div>
        </div>
        <p className="-mt-2 text-xs text-muted">Phone or email is enough. We send the code to the one you give.</p>


        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="password">Password</Label>
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
            <Label htmlFor="confirmPassword">Confirm password</Label>
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
        </div>

        <div>
          <label className="flex items-start gap-2.5 text-[13px]">
            <input type="checkbox" className="mt-0.5 size-4" {...register('agreed')} />
            <span>
              I agree to the{' '}
              <Link href="/terms" target="_blank" className="font-bold text-green-700 hover:underline">
                Terms
              </Link>
              ,{' '}
              <Link href="/privacy" target="_blank" className="font-bold text-green-700 hover:underline">
                Privacy Policy
              </Link>{' '}
              and the safety, prohibited items and offline payment rules. I will not use Urgent.ng for prohibited
              or unsafe items.
            </span>
          </label>
          <FieldError message={errors.agreed?.message} />
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Continue'}
          {!isSubmitting && <ArrowRight className="size-[18px]" />}
        </Button>
      </form>

      <OrDivider />
      <GoogleButton />
    </>
  );
}
