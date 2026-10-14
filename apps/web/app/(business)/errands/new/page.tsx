import type { Metadata } from 'next';
import { PostErrandForm } from '@/features/errands/post-form/post-errand-form';

export const metadata: Metadata = {
  title: 'Post an Errand — Urgent.ng',
};

export default function NewErrandPage() {
  return <PostErrandForm />;
}
