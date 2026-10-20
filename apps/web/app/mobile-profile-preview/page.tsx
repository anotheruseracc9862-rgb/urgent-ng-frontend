'use client';

import { useSearchParams } from 'next/navigation';
import { BottomNav } from '@/components/shell/bottom-nav';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';

export default function MobileProfilePreview() {
  const search = useSearchParams();
  const variant = search.get('photo') ?? 'present';
  const mode = search.get('mode') === 'RUNNER' ? 'RUNNER' : 'REQUESTER';
  const me = { id: variant, name: 'Ada Okafor', photoMediaId: variant === 'missing' ? null : variant, startMode: mode, status: 'ACTIVE' } as Me;
  return <SessionProvider key={variant} me={me}><main className="min-h-screen bg-panel" /><BottomNav mode={mode} /></SessionProvider>;
}
