import type { Metadata } from 'next';
import { OpenDisputePage } from '@/features/safety/disputes/open-dispute-page';

export const metadata: Metadata = { title: 'Dispute — Urgent.ng' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <OpenDisputePage assignmentId={(await params).id} />;
}
