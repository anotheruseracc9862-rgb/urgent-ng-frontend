'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Label } from '@urgent/ui';
import Link from 'next/link';
import { initiateGoogleAuth } from '@/lib/google-oauth';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Phone or email is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [lockoutInfo, setLockoutInfo] = useState<{
    lockedUntil: string;
    remainingMinutes: number;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setErrorMessage('');
    setLockoutInfo(null);

    try {
      // TODO: Call POST /auth/login
      // const result = await apiClient.post('/auth/login', {
      //   phone: data.identifier.includes('@') ? undefined : data.identifier,
      //   email: data.identifier.includes('@') ? data.identifier : undefined,
      //   password: data.password,
      // });

      // For now, simulate success
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // TODO: Handle session (cookies are set by the API)
      // Check account status from response
      // - ACTIVE -> redirect to dashboard
      // - SUSPENDED -> redirect to /account/standing
      // - DEACTIVATED -> redirect to /account/reactivate
      // - DELETION_PENDING -> redirect to /account/standing

      router.push('/dashboard');
    } catch (error: unknown) {
      // Handle errors
      if (error && typeof error === 'object' && 'code' in error) {
        const errorCode = (error as { code?: string }).code;

        if (errorCode === 'INVALID_CREDENTIALS') {
          setErrorMessage('Invalid phone/email or password. Please try again.');
        } else if (errorCode === 'ACCOUNT_LOCKED') {
          const details = (error as { details?: { lockedUntil?: string; waitSeconds?: number } })
            .details;
          if (details?.lockedUntil && details?.waitSeconds) {
            const minutes = Math.ceil(details.waitSeconds / 60);
            setLockoutInfo({
              lockedUntil: details.lockedUntil,
              remainingMinutes: minutes,
            });
            setErrorMessage(
              `Account temporarily locked due to too many failed attempts. Try again in ${minutes} minutes.`
            );
          } else {
            setErrorMessage('Account is locked. Please contact support.');
          }
        } else if (errorCode === 'ACCOUNT_SUSPENDED') {
          setErrorMessage('Your account has been suspended. Redirecting...');
          setTimeout(() => router.push('/account/standing'), 2000);
        } else if (errorCode === 'ACCOUNT_DEACTIVATED') {
          setErrorMessage('Account is deactivated. Redirecting to reactivation...');
          setTimeout(() => router.push('/account/reactivate'), 2000);
        } else {
          setErrorMessage('Login failed. Please try again.');
        }
      } else {
        setErrorMessage('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-3xl shadow-xl p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-cn-blue-900 mb-2">Welcome Back</h1>
          <p className="text-cn-blue-600">Sign in to your Urgent.ng account</p>
        </div>

        {errorMessage && (
          <div
            className={`mb-6 p-4 rounded-xl text-sm ${
              lockoutInfo
                ? 'bg-amber-50 border border-amber-200 text-amber-800'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Identifier (Phone or Email) */}
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

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-cn-green-600 hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder="Enter your password"
                autoComplete="current-password"
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
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          {/* Remember Me */}
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              {...register('rememberMe')}
              className="w-4 h-4 rounded border-cn-blue-300 text-cn-green-600 focus:ring-cn-green-600 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-sm text-cn-blue-700 group-hover:text-cn-blue-900">
              Remember me
            </span>
          </label>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isLoading || !!lockoutInfo}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-cn-blue-100" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-4 text-cn-blue-500">OR</span>
          </div>
        </div>

        {/* Google Sign In */}
        <Button
          type="button"
          variant="ghost"
          className="w-full border border-cn-blue-200"
          size="lg"
          onClick={initiateGoogleAuth}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </Button>

        {/* Sign Up Link */}
        <div className="mt-6 text-center text-sm text-cn-blue-600">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-cn-green-600 font-semibold hover:underline">
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
