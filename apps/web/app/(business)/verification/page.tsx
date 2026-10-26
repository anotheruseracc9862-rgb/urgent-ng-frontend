import type { Metadata } from 'next';
import { VerificationPage } from '@/features/verification/verification-page';

export const metadata: Metadata = {
  title: 'Runner Verification — Urgent.ng',
};

export default function VerificationRoute() {
  return <VerificationPage />;
}
