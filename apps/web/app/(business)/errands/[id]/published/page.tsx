import type { Metadata } from 'next';
import { ErrandPublishedPage } from '@/features/errands/published/errand-published-page';

export const metadata: Metadata = {
  title: 'Your Errand Is Live — Urgent.ng',
};

export default async function ErrandPublishedRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ErrandPublishedPage errandId={id} />;
}
