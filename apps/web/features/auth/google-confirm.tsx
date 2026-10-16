'use client';

import * as React from 'react';
import Script from 'next/script';

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

/**
 * Asks Google for a fresh ID token to confirm a sensitive change on an account that has no
 * password. The token goes to the API only; it is not stored.
 */
export function GoogleConfirm({ onToken }: { onToken: (idToken: string) => void }) {
  const holder = React.useRef<HTMLDivElement>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    if (!ready || !window.google || !holder.current) return;
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: (response) => onToken(response.credential),
    });
    window.google.accounts.id.renderButton(holder.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      width: holder.current.clientWidth || 320,
    });
  }, [ready, onToken]);

  if (!CLIENT_ID) {
    return <p className="text-sm text-muted">Google confirmation is not available right now.</p>;
  }

  return (
    <div>
      <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" onReady={() => setReady(true)} />
      <div ref={holder} className="flex min-h-[44px] justify-start" />
    </div>
  );
}
