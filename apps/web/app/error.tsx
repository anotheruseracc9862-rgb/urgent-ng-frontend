'use client';

import { Alert, Button } from '@urgent/ui';
import { useEffect } from 'react';
import { isApiError } from '@/lib/api/client';
import { reportError } from '@/lib/observability/report';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, 'route');
  }, [error]);

  const requestId = isApiError(error) ? error.requestId : undefined;

  return (
    <main className="mx-auto grid min-h-[60vh] w-full max-w-xl content-center gap-4 p-4">
      <Alert variant="danger" role="alert">
        <h1 className="font-extrabold">We could not load this page</h1>
        <p className="mt-1 text-sm">Check your connection and try again.</p>
        {requestId ? <p className="mt-2 text-xs">Reference: {requestId}</p> : null}
      </Alert>
      <Button type="button" onClick={() => reset()}>Try again</Button>
    </main>
  );
}
