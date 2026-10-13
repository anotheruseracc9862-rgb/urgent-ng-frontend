import Link from 'next/link';
import { Button } from '@urgent/ui';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Link Expired — Urgent.ng',
  description: 'This link has expired or is no longer valid',
};

export default function LinkExpiredPage() {
  return (
    <div className="flex-1 flex items-center justify-center bg-cn-blue-50 py-16">
      <div className="container mx-auto px-4 max-w-2xl text-center">
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-lg">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-100 flex items-center justify-center">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-amber-600"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-cn-blue-900 mb-4">
            Link Expired
          </h1>

          <p className="text-lg text-cn-blue-600 mb-8">
            This link has expired or is no longer valid. Links for password resets, email
            verification, and shared errands expire after a certain time for security reasons.
          </p>

          <div className="bg-cn-blue-50 rounded-2xl p-6 mb-8 text-left">
            <h2 className="font-bold text-cn-blue-900 mb-3">What you can do:</h2>
            <ul className="space-y-2 text-cn-blue-700">
              <li className="flex items-start gap-2">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="flex-shrink-0 mt-0.5 text-cn-green-600"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>
                  <strong>Password reset?</strong> Request a new reset link from the login page
                </span>
              </li>
              <li className="flex items-start gap-2">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="flex-shrink-0 mt-0.5 text-cn-green-600"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>
                  <strong>Email verification?</strong> Log in and request to resend the
                  verification code
                </span>
              </li>
              <li className="flex items-start gap-2">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="flex-shrink-0 mt-0.5 text-cn-green-600"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>
                  <strong>Shared errand?</strong> Ask the requester to share a new tracking link
                </span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/">Go to Homepage</Link>
            </Button>
            <Button size="lg" variant="ghost" className="border border-cn-blue-200" asChild>
              <Link href="/help">Get Help</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
