import type { Metadata } from 'next';
import { CheckoutPage } from '@/features/billing/checkout-page';

export const metadata: Metadata = { title: 'Payment — Urgent.ng' };

export default async function CheckoutRoute({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <CheckoutPage orderId={orderId} />;
}
