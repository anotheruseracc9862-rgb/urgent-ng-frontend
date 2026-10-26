import type { Metadata } from 'next';
import { CheckoutReturn } from '@/features/billing/checkout-return';

export const metadata: Metadata = { title: 'Payment — Urgent.ng' };

export default function CheckoutReturnRoute() {
  return <CheckoutReturn />;
}
