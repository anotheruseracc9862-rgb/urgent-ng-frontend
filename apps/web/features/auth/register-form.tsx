'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Label } from '@urgent/ui';
import Link from 'next/link';
import { initiateGoogleAuth } from '@/lib/google-oauth';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  homeArea: z.string().max(80).optional(),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
  privacyAccepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the privacy policy',
  }),
}).refine((data) => data.phone || data.email, {
  message: 'Either phone or email is required',
  path: ['phone'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') || 'requester';
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      termsAccepted: false,
      privacyAccepted: false,
    },
  });

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      // TODO: Call POST /auth/register
      // const result = await apiClient.post('/auth/register', {
      //   name: data.name,
      //   password: data.password,
      //   phone: data.phone,
      //   email: data.email,
      //   homeArea: data.homeArea,
      //   consents: [
      //     { type: 'TERMS_OF_SERVICE', version: '1.0' },
      //     { type: 'PRIVACY_POLICY', version: '1.0' },
      //   ],
      // });

      // For now, simulate success and navigate to verify
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Store verification context in session storage (never in URL)
      sessionStorage.setItem('pendingVerification', JSON.stringify({
        phone: data.phone,
        email: data.email,
        verifyVia: data.phone ? 'phone' : 'email',
      }));

      router.push('/verify');
    } catch (error) {
      // Handle errors
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Registration failed. Please try again.');
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
          <h1 className="text-3xl font-bold text-cn-blue-900 mb-2">Create Your Account</h1>
          <p className="text-cn-blue-600">
            Join {mode === 'runner' ? 'as a Runner to earn money' : 'to post your first errand'}
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Name */}
          <div>
            <Label htmlFor="name">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Enter your full name"
              className="mt-1.5"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              {...register('phone')}
              placeholder="080 1234 5678"
              className="mt-1.5"
            />
            {errors.phone && (
              <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="your@email.com"
              className="mt-1.5"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
            <p className="mt-1 text-xs text-cn-blue-600">
              Provide at least phone or email for verification
            </p>
          </div>

          {/* Password */}
          <div>
            <Label htmlFor="password">
              Password <span className="text-red-500">*</span>
            </Label>
            <div className="relative mt-1.5">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder="Create a strong password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cn-blue-400 hover:text-cn-blue-600"
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

          {/* Home Area (optional) */}
          {mode === 'runner' && (
            <div>
              <Label htmlFor="homeArea">Home Area (Optional)</Label>
              <Input
                id="homeArea"
                {...register('homeArea')}
                placeholder="e.g. Lagos - Lekki & Ajah"
                className="mt-1.5"
              />
              <p className="mt-1 text-xs text-cn-blue-600">
                Help us show you nearby errands
              </p>
            </div>
          )}

          {/* Consents */}
          <div className="space-y-3 pt-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                {...register('termsAccepted')}
                className="mt-1 w-4 h-4 rounded border-cn-blue-300 text-cn-green-600 focus:ring-cn-green-600 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-sm text-cn-blue-700 group-hover:text-cn-blue-900">
                I agree to the{' '}
                <Link href="/terms" target="_blank" className="text-cn-green-600 hover:underline">
                  Terms of Service
                </Link>
              </span>
            </label>
            {errors.termsAccepted && (
              <p className="text-xs text-red-600 pl-7">{errors.termsAccepted.message}</p>
            )}

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                {...register('privacyAccepted')}
                className="mt-1 w-4 h-4 rounded border-cn-blue-300 text-cn-green-600 focus:ring-cn-green-600 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-sm text-cn-blue-700 group-hover:text-cn-blue-900">
                I agree to the{' '}
                <Link href="/privacy" target="_blank" className="text-cn-green-600 hover:underline">
                  Privacy Policy
                </Link>
              </span>
            </label>
            {errors.privacyAccepted && (
              <p className="text-xs text-red-600 pl-7">{errors.privacyAccepted.message}</p>
            )}
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Create Account'}
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

        {/* Sign In Link */}
        <div className="mt-6 text-center text-sm text-cn-blue-600">
          Already have an account?{' '}
          <Link href="/login" className="text-cn-green-600 font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
