'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Label } from '@urgent/ui';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128)
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const password = watch('password');

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      // TODO: Call POST /auth/password/reset
      // const result = await apiClient.post('/auth/password/reset', {
      //   token,
      //   newPassword: data.password,
      // });

      // For now, simulate success
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // All other sessions end after password reset
      // Redirect to login
      router.push('/login?reset=success');
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error) {
        const errorCode = (error as { code?: string }).code;

        if (errorCode === 'TOKEN_INVALID' || errorCode === 'TOKEN_EXPIRED') {
          setErrorMessage(
            'This reset link has expired or is invalid. Please request a new one.'
          );
        } else {
          setErrorMessage('Password reset failed. Please try again.');
        }
      } else {
        setErrorMessage('Password reset failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = password
    ? [
        password.length >= 8,
        /[A-Z]/.test(password),
        /[a-z]/.test(password),
        /[0-9]/.test(password),
      ].filter(Boolean).length
    : 0;

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-3xl shadow-xl p-8">
        <div className="mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cn-green-100 flex items-center justify-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-cn-green-700"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-cn-blue-900 mb-2 text-center">
            Set New Password
          </h1>
          <p className="text-cn-blue-600 text-center">
            Choose a strong password for your account
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* New Password */}
          <div>
            <Label htmlFor="password">
              New Password <span className="text-red-500">*</span>
            </Label>
            <div className="relative mt-1.5">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder="Enter your new password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cn-blue-400 hover:text-cn-blue-600"
              >
                {showPassword ? (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {password && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full ${
                        passwordStrength >= level
                          ? passwordStrength <= 2
                            ? 'bg-red-500'
                            : passwordStrength === 3
                            ? 'bg-amber-500'
                            : 'bg-green-600'
                          : 'bg-cn-blue-100'
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-1 text-xs text-cn-blue-600">
                  {passwordStrength <= 2
                    ? 'Weak password'
                    : passwordStrength === 3
                    ? 'Good password'
                    : 'Strong password'}
                </p>
              </div>
            )}
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <Label htmlFor="confirmPassword">
              Confirm Password <span className="text-red-500">*</span>
            </Label>
            <div className="relative mt-1.5">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                {...register('confirmPassword')}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cn-blue-400 hover:text-cn-blue-600"
              >
                {showConfirmPassword ? (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? 'Resetting Password...' : 'Reset Password'}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-cn-blue-50 rounded-xl text-sm text-cn-blue-700">
          <p className="font-semibold mb-1">After resetting:</p>
          <p>
            All your other active sessions will be signed out for security. You&apos;ll need to
            sign in again with your new password.
          </p>
        </div>
      </div>
    </div>
  );
}
