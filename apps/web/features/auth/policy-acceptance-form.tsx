'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@urgent/ui';
import Link from 'next/link';

interface PolicyChange {
  type: 'TERMS_OF_SERVICE' | 'PRIVACY_POLICY';
  version: string;
  publishedAt: string;
  summary: string;
}

interface PolicyAcceptanceFormProps {
  changedPolicies: PolicyChange[];
  onAccept: () => Promise<void>;
}

export function PolicyAcceptanceForm({ changedPolicies, onAccept }: PolicyAcceptanceFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [acceptedPolicies, setAcceptedPolicies] = useState<Set<string>>(new Set());

  const handleCheckboxChange = (policyType: string) => {
    const newAccepted = new Set(acceptedPolicies);
    if (newAccepted.has(policyType)) {
      newAccepted.delete(policyType);
    } else {
      newAccepted.add(policyType);
    }
    setAcceptedPolicies(newAccepted);
  };

  const allAccepted = changedPolicies.every((policy) => acceptedPolicies.has(policy.type));

  const handleAccept = async () => {
    if (!allAccepted) {
      setErrorMessage('Please accept all policies to continue');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      await onAccept();
      // The parent will handle navigation/retry of original action
    } catch (error) {
      setErrorMessage('Failed to save your acceptance. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getPolicyLabel = (type: string) => {
    switch (type) {
      case 'TERMS_OF_SERVICE':
        return 'Terms of Service';
      case 'PRIVACY_POLICY':
        return 'Privacy Policy';
      default:
        return type;
    }
  };

  const getPolicyUrl = (type: string) => {
    switch (type) {
      case 'TERMS_OF_SERVICE':
        return '/terms';
      case 'PRIVACY_POLICY':
        return '/privacy';
      default:
        return '/';
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="bg-white rounded-3xl shadow-xl p-8">
        <div className="mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-amber-600"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-cn-blue-900 mb-2 text-center">
            Policy Update Required
          </h1>
          <p className="text-cn-blue-600 text-center">
            We&apos;ve updated our policies. Please review and accept to continue using Urgent.ng
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {errorMessage}
          </div>
        )}

        <div className="space-y-6 mb-8">
          {changedPolicies.map((policy) => (
            <div
              key={policy.type}
              className="border border-cn-blue-200 rounded-2xl p-6 bg-cn-blue-50"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-cn-blue-900 mb-1">
                    {getPolicyLabel(policy.type)}
                  </h3>
                  <p className="text-xs text-cn-blue-600">
                    Version {policy.version} • Updated{' '}
                    {new Date(policy.publishedAt).toLocaleDateString('en-NG', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <Link
                  href={getPolicyUrl(policy.type)}
                  target="_blank"
                  className="text-sm font-semibold text-cn-green-600 hover:underline flex items-center gap-1"
                >
                  Read Full Policy
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </Link>
              </div>

              <div className="bg-white rounded-xl p-4 mb-4">
                <h4 className="text-sm font-semibold text-cn-blue-900 mb-2">
                  What&apos;s Changed:
                </h4>
                <p className="text-sm text-cn-blue-700 leading-relaxed">{policy.summary}</p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={acceptedPolicies.has(policy.type)}
                  onChange={() => handleCheckboxChange(policy.type)}
                  className="mt-1 w-5 h-5 rounded border-cn-blue-300 text-cn-green-600 focus:ring-cn-green-600 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-sm text-cn-blue-700 group-hover:text-cn-blue-900 font-medium">
                  I have read and accept the updated {getPolicyLabel(policy.type)}
                </span>
              </label>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleAccept}
            className="w-full"
            size="lg"
            disabled={isLoading || !allAccepted}
          >
            {isLoading ? 'Saving...' : 'Accept All & Continue'}
          </Button>

          <p className="text-xs text-center text-cn-blue-600">
            You must accept all policy updates to continue using Urgent.ng
          </p>
        </div>
      </div>
    </div>
  );
}
