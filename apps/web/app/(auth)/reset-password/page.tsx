import { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { ResetPasswordForm } from '@/features/auth/reset-password-form';

export const metadata: Metadata = {
  title: 'Reset Password — Urgent.ng',
  description: 'Set a new password for your Urgent.ng account',
};

interface ResetPasswordPageProps {
  searchParams: { token?: string };
}

export default function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = searchParams;

  if (!token) {
    redirect('/link-expired');
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm token={token} />
    </Suspense>
  );
}
