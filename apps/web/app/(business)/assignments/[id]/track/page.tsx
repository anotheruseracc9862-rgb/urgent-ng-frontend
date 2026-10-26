import type { Metadata } from 'next';
import { LiveTrackingPage } from '@/features/location/track/live-tracking-page';

export const metadata: Metadata = {
  title: 'Live Tracking — Urgent.ng',
};

export default async function AssignmentTrackingRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LiveTrackingPage assignmentId={id} />;
}
