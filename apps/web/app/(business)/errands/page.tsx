import type { Metadata } from 'next';
import { MyErrandsPage } from '@/features/errands/my-errands-page';

export const metadata: Metadata = {
  title: 'My Errands — Urgent.ng',
};

export default function MyErrandsRoute() {
  return <MyErrandsPage />;
}
