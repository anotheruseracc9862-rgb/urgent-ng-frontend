import type { Metadata } from 'next';
import { PostErrandForm } from '@/features/errands/post-form/post-errand-form';

export const metadata: Metadata = {
  title: 'Edit Errand — Urgent.ng',
};

export default async function EditErrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PostErrandForm errandId={id} />;
}
