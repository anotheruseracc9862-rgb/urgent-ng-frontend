'use client';

import { RunnerProfilePage } from '@/features/runner/runner-profile-page';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';

const me = { id: 'dropdown-preview', name: 'Ada Okafor', firstName: 'Ada', lastName: 'Okafor', status: 'ACTIVE', startMode: 'RUNNER', phoneVerified: true, emailVerified: true } as Me;

export default function Preview() {
  return <SessionProvider me={me}><div className="mx-auto w-full max-w-[1100px] p-4 sm:p-8"><RunnerProfilePage /></div></SessionProvider>;
}
