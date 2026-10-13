'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { verifyStateToken } from '@/lib/google-oauth';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      // Get OAuth parameters from URL
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      // Handle OAuth errors
      if (error) {
        setStatus('error');
        if (error === 'access_denied') {
          setErrorMessage('You cancelled the sign-in process.');
        } else {
          setErrorMessage(`Authentication failed: ${error}`);
        }
        return;
      }

      // Validate required parameters
      if (!code || !state) {
        setStatus('error');
        setErrorMessage('Invalid callback parameters.');
        return;
      }

      // Verify state token (CSRF protection)
      if (!verifyStateToken(state)) {
        setStatus('error');
        setErrorMessage('Invalid state token. Please try again.');
        return;
      }

      try {
        // TODO: Call POST /auth/google/callback with { code }
        // The backend will:
        // 1. Exchange code for Google tokens
        // 2. Fetch user info from Google
        // 3. Find or create user account
        // 4. Issue session tokens
        // 5. Return account status and redirect path

        // const result = await apiClient.post('/auth/google/callback', { code });

        // For now, simulate success
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Mock response handling
        const mockResponse = {
          isNewUser: false,
          needsOnboarding: false,
          accountStatus: 'ACTIVE',
          redirectTo: '/dashboard',
        };

        // Determine redirect based on account state
        if (mockResponse.needsOnboarding) {
          router.push('/onboarding');
        } else if (mockResponse.accountStatus === 'SUSPENDED') {
          router.push('/account/standing');
        } else if (mockResponse.accountStatus === 'DEACTIVATED') {
          router.push('/account/reactivate');
        } else {
          router.push(mockResponse.redirectTo || '/dashboard');
        }
      } catch (err: unknown) {
        setStatus('error');
        if (err && typeof err === 'object' && 'code' in err) {
          const errorCode = (err as { code?: string }).code;
          if (errorCode === 'GOOGLE_AUTH_FAILED') {
            setErrorMessage('Failed to authenticate with Google. Please try again.');
          } else if (errorCode === 'ACCOUNT_SUSPENDED') {
            setErrorMessage('Your account has been suspended. Redirecting...');
            setTimeout(() => router.push('/account/standing'), 2000);
            return;
          } else {
            setErrorMessage('Sign-in failed. Please try again.');
          }
        } else {
          setErrorMessage('Sign-in failed. Please try again.');
        }
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        {status === 'processing' ? (
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              Completing sign-in...
            </h2>
            <p className="text-gray-600">Please wait while we verify your account.</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              Sign-In Failed
            </h2>
            <p className="mb-6 text-gray-600">{errorMessage}</p>
            <button
              onClick={() => router.push('/login')}
              className="w-full rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white hover:bg-purple-700"
            >
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
