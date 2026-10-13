import { Metadata } from 'next';
import { LoginForm } from '@/features/auth/login-form';

export const metadata: Metadata = {
  title: 'Sign In — Urgent.ng',
  description: 'Sign in to your Urgent.ng account',
};

export default function LoginPage() {
  return <LoginForm />;
}
