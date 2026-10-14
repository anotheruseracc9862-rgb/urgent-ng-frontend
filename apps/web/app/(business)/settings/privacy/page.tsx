import type { Metadata } from 'next';
import { ConsentsPage } from '@/features/settings/consents-page';

export const metadata: Metadata = {
  title: 'Privacy & Consents — Urgent.ng',
};

export default function PrivacySettingsPage() {
  return <ConsentsPage />;
}
