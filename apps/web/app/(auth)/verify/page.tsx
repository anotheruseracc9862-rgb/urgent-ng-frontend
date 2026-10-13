import { Metadata } from 'next';
import { VerifyOtpForm } from '@/features/auth/verify-otp-form';

export const metadata: Metadata = {
  title: 'Verify Account — Urgent.ng',
  description: 'Enter the verification code sent to your phone or email',
};

export default function VerifyPage() {
  return <VerifyOtpForm />;
}
