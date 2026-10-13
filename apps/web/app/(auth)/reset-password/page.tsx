import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/features/auth/reset-password-form';

export const metadata: Metadata = {
  title: 'Reset password — Urgent.ng',
  description: 'Set a new password for your Urgent.ng account',
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
