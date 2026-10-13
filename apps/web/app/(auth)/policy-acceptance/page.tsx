import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PolicyAcceptanceForm } from '@/features/auth/policy-acceptance-form';

export const metadata: Metadata = {
  title: 'Policy update — Urgent.ng',
  description: 'Review and accept updated policies',
};

export default function PolicyAcceptancePage() {
  return (
    <Suspense fallback={null}>
      <PolicyAcceptanceForm />
    </Suspense>
  );
}
