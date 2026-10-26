import type { Metadata } from 'next';
import { DisputeDetailPage } from '@/features/safety/disputes/dispute-detail-page';

export const metadata: Metadata = { title: 'Dispute status — Urgent.ng' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <DisputeDetailPage disputeId={(await params).id} />;
}
