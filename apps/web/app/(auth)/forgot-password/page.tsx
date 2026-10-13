import { Metadata } from 'next';
import { ForgotPasswordForm } from '@/features/auth/forgot-password-form';

export const metadata: Metadata = {
  title: 'Forgot Password — Urgent.ng',
  description: 'Reset your Urgent.ng account password',
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
