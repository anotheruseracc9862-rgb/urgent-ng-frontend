'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText } from 'lucide-react';
import { Alert, Button } from '@urgent/ui';
import { authApi } from '@/lib/api/auth';
import { isApiError, safeRedirect } from '@/lib/api/client';
import type { ConsentType, PolicyVersion } from '@/lib/api/types';
import { AuthHeading, FormError, describeAuthError } from './auth-ui';

const LABELS: Record<ConsentType, { label: string; href: string }> = {
  TERMS_OF_SERVICE: { label: 'Terms of Service', href: '/terms' },
  PRIVACY_POLICY: { label: 'Privacy Policy', href: '/privacy' },
  SAFETY_POLICY: { label: 'Safety Policy', href: '/help' },
  PROHIBITED_ITEMS_POLICY: { label: 'Prohibited Items Policy', href: '/terms' },
  OFFLINE_PAYMENT_TERMS: { label: 'Offline Payment Terms', href: '/help' },
  LOCATION_SHARING: { label: 'Location Sharing', href: '/privacy' },
  MARKETING_COMMUNICATIONS: { label: 'Marketing Communications', href: '/privacy' },
};

/**
 * Blocking page for `POLICY_ACCEPTANCE_REQUIRED` (F1-06). Lists what changed, records each
 * acceptance, then sends the person back to where they were.
 */
export function PolicyAcceptanceForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = safeRedirect(params.get('redirect'));

  const [outstanding, setOutstanding] = useState<PolicyVersion[] | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    authApi
      .consents()
      .then((history) => {
        if (cancelled) return;
        if (history.outstanding.length === 0) router.replace(redirect);
        else setOutstanding(history.outstanding);
      })
      .catch((e) => {
        if (cancelled) return;
        if (isApiError(e) && e.status === 401) router.replace(`/session?redirect=${encodeURIComponent(redirect)}`);
        else setError(describeAuthError(e));
      });
    return () => {
      cancelled = true;
    };
  }, [redirect, router]);

  if (outstanding === null) {
    return error ? (
      <FormError message={error} />
    ) : (
      <p className="text-sm font-semibold text-muted">Loading policy changes…</p>
    );
  }

  const allChecked = outstanding.every((p) => checked.has(p.id));

  const accept = async () => {
    setBusy(true);
    setError('');
    try {
      for (const policy of outstanding) {
        await authApi.acceptConsent({ type: policy.type, version: policy.version });
      }
      router.replace(redirect);
      router.refresh();
    } catch (e) {
      setError(describeAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AuthHeading title="Our policies changed">
        Review and accept the updates below to keep using Urgent.ng.
      </AuthHeading>

      <FormError message={error} />

      <ul className="grid gap-3">
        {outstanding.map((policy) => {
          const info = LABELS[policy.type];
          return (
            <li key={policy.id} className="rounded-[var(--r)] border border-line bg-panel p-4">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 size-5 shrink-0 text-green-700" />
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold">{info.label}</div>
                  <div className="text-xs text-muted">
                    Version {policy.version} · published{' '}
                    {new Date(policy.publishedAt).toLocaleDateString('en-NG', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                  <Link
                    href={info.href}
                    target="_blank"
                    className="mt-1 inline-block text-[13px] font-bold text-green-700 hover:underline"
                  >
                    Read the full text
                  </Link>
                </div>
              </div>
              <label className="mt-3 flex items-start gap-2.5 text-[13px]">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4"
                  checked={checked.has(policy.id)}
                  onChange={(e) => {
                    const next = new Set(checked);
                    if (e.target.checked) next.add(policy.id);
                    else next.delete(policy.id);
                    setChecked(next);
                  }}
                />
                <span>I have read and accept the {info.label}.</span>
              </label>
            </li>
          );
        })}
      </ul>

      <Alert variant="info">Until you accept, actions that change anything are blocked.</Alert>

      <Button size="lg" className="w-full" disabled={!allChecked || busy} onClick={accept}>
        {busy ? 'Saving…' : 'Accept and continue'}
      </Button>
    </>
  );
}
