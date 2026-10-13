'use client';

import * as React from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { Button } from '@urgent/ui';
import { authApi } from '@/lib/api/auth';
import { isApiError, safeRedirect } from '@/lib/api/client';
import { REQUIRED_CONSENTS, type ConsentInput } from '@/lib/api/types';
import { describeAuthError, FormError } from './auth-ui';
import { routeAfterLogin } from './after-login';

interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (config: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string }) => void;
      renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

/**
 * Google Identity Services button (Frontend Build Plan F1-09).
 * The ID token goes to `POST /auth/google`. A first sign-in answers `GOOGLE_SIGNUP_REQUIRED`,
 * then the person accepts the policies here and the call is repeated with them.
 */
export function GoogleButton({ redirect, homeArea }: { redirect?: string | null; homeArea?: string }) {
  const router = useRouter();
  const holder = React.useRef<HTMLDivElement>(null);
  const [ready, setReady] = React.useState(false);
  const [hidden, setHidden] = React.useState(!CLIENT_ID);
  const [error, setError] = React.useState('');
  const [pendingToken, setPendingToken] = React.useState<string | null>(null);
  const [policies, setPolicies] = React.useState<ConsentInput[]>([]);
  const [agreed, setAgreed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const finish = React.useCallback(
    async (idToken: string, consents?: ConsentInput[]) => {
      setBusy(true);
      setError('');
      try {
        const result = await authApi.google({ idToken, consents, homeArea });
        setPendingToken(null);
        await routeAfterLogin(router, result.status, safeRedirect(redirect), result.isNewAccount);
      } catch (e) {
        if (isApiError(e) && e.code === 'GOOGLE_SIGNUP_REQUIRED') {
          try {
            const current = await authApi.policies();
            const wanted = current
              .filter((p) => REQUIRED_CONSENTS.includes(p.type))
              .map((p) => ({ type: p.type, version: p.version }));
            setPolicies(wanted);
            setPendingToken(idToken);
          } catch (inner) {
            setError(describeAuthError(inner));
          }
        } else if (isApiError(e) && e.code === 'SIGN_IN_PROVIDER_UNAVAILABLE') {
          setHidden(true);
        } else {
          setError(describeAuthError(e));
        }
      } finally {
        setBusy(false);
      }
    },
    [homeArea, redirect, router],
  );

  React.useEffect(() => {
    if (!ready || !window.google || !holder.current) return;
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: (r) => void finish(r.credential),
    });
    window.google.accounts.id.renderButton(holder.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      width: holder.current.clientWidth || 360,
    });
  }, [ready, finish]);

  if (hidden) return null;

  return (
    <div className="grid gap-3">
      <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" onLoad={() => setReady(true)} />
      <div ref={holder} className="flex min-h-[44px] justify-center" aria-busy={busy} />
      <FormError message={error} />

      {pendingToken ? (
        <div className="grid gap-3 rounded-[var(--r)] bg-tint p-4 text-[13px]" role="group" aria-label="Accept policies">
          <p className="font-bold">One last step: accept our policies to create your account.</p>
          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 size-4"
            />
            <span>
              I agree to the Terms of Service, Privacy Policy, Safety Policy, Prohibited Items Policy and the
              offline payment terms.
            </span>
          </label>
          <Button
            type="button"
            disabled={!agreed || busy}
            onClick={() => void finish(pendingToken, policies)}
          >
            {busy ? 'Creating account…' : 'Create account'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

