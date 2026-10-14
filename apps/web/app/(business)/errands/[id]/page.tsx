import type { Metadata } from 'next';
import { ErrandDetailPage } from '@/features/errands/detail/errand-detail-page';

export const metadata: Metadata = {
  title: 'Errand Details — Urgent.ng',
};

export default async function ErrandDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ErrandDetailPage errandId={id} />;
}
