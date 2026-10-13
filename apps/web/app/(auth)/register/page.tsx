import { Metadata } from 'next';
import { Suspense } from 'react';
import { RegisterForm } from '@/features/auth/register-form';

export const metadata: Metadata = {
  title: 'Create Account — Urgent.ng',
  description: 'Sign up for Urgent.ng to post errands or earn as a runner',
};

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
