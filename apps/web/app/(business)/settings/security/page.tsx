import type { Metadata } from 'next';
import { SecuritySettingsPage } from '@/features/settings/security-settings-page';

export const metadata: Metadata = {
  title: 'Security — Urgent.ng',
};

export default function SecuritySettingsRoute() {
  return <SecuritySettingsPage />;
}
