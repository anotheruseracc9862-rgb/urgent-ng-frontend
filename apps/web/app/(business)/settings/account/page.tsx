import type { Metadata } from 'next';
import { AccountLifecyclePage } from '@/features/settings/account-lifecycle-page';

export const metadata: Metadata = {
  title: 'Deactivate or Delete Account — Urgent.ng',
};

export default function AccountLifecycleRoute() {
  return <AccountLifecyclePage />;
}
