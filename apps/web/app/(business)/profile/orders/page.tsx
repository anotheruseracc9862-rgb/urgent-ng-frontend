import type { Metadata } from 'next';
import { OrdersPage } from '@/features/billing/orders-page';

export const metadata: Metadata = { title: 'Orders and receipts — Urgent.ng' };

export default function OrdersRoute() {
  return <OrdersPage />;
}
