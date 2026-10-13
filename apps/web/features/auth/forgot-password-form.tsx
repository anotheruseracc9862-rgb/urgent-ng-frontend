'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Label } from '@urgent/ui';
import Link from 'next/link';

const forgotPasswordSchema = z.object({
  identifier: z.string().min(1, 'Phone or email is required'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // TODO: Call POST /auth/password/forgot
      // const result = await apiClient.post('/auth/password/forgot', {
      //   phone: data.identifier.includes('@') ? undefined : data.identifier,
      //   email: data.identifier.includes('@') ? data.identifier : undefined,
      // });

      // For now, simulate success
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSuccessMessage(
        `If an account exists with ${data.identifier}, you will receive a password reset link shortly.`
      );
    } catch (error: unknown) {
      // The API always returns success to prevent account enumeration
      // But handle any network errors
      setSuccessMessage(
        `If an account exists with ${data.identifier}, you will receive a password reset link shortly.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-3xl shadow-xl p-8">
        <div className="mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cn-blue-100 flex items-center justify-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-cn-blue-600"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-cn-blue-900 mb-2 text-center">
            Reset Password
          </h1>
          <p className="text-cn-blue-600 text-center">
            Enter your phone or email and we&apos;ll send you a reset link
          </p>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {errorMessage}
          </div>
        )}

        {!successMessage && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Identifier */}
            <div>
              <Label htmlFor="identifier">Phone Number or Email</Label>
              <Input
                id="identifier"
                {...register('identifier')}
                placeholder="080 1234 5678 or your@email.com"
                className="mt-1.5"
                autoComplete="username"
              />
              {errors.identifier && (
                <p className="mt-1 text-xs text-red-600">{errors.identifier.message}</p>
              )}
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
        )}

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm text-cn-blue-600 hover:text-cn-blue-900 hover:underline inline-flex items-center gap-1"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
