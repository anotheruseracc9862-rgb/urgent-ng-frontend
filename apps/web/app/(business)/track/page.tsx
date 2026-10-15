import type { Metadata } from 'next';
import { TrackErrandsPage } from '@/features/errands/track/track-errands-page';

export const metadata: Metadata = { title: 'Track your errands — Urgent.ng' };

export default function TrackRoute() {
  return <TrackErrandsPage />;
}
