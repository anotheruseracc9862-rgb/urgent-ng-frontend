import type { Metadata } from 'next';
import { ErrandReviewPage } from '@/features/errands/review/errand-review-page';

export const metadata: Metadata = {
  title: 'Review Your Errand — Urgent.ng',
};

export default async function ErrandReviewRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ErrandReviewPage errandId={id} />;
}
