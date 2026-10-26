import type { Metadata } from 'next';
import { CancelErrandPage } from '@/features/errands/cancel/cancel-errand-page';

export const metadata: Metadata = {
  title: 'Cancel Errand — Urgent.ng',
};

export default async function CancelErrandRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CancelErrandPage errandId={id} />;
}
