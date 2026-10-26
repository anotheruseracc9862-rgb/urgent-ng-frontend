import type { Metadata } from 'next';
import { ProPage } from '@/features/billing/pro-page';

export const metadata: Metadata = { title: 'Runner Pro — Urgent.ng' };

export default function ProRoute() {
  return <ProPage />;
}
