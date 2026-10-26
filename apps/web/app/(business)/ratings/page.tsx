import type { Metadata } from 'next';
import { RatingsPage } from '@/features/ratings/ratings-page';

export const metadata: Metadata = { title: 'Reviews — Urgent.ng' };

export default function RatingsRoute() {
  return <RatingsPage />;
}
