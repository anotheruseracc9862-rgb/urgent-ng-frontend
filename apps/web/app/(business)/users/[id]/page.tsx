import type { Metadata } from 'next';
import { PublicProfilePage } from '@/features/profile/public-profile-page';

export const metadata: Metadata = {
  title: 'Public Profile — Urgent.ng',
};

export default async function PublicProfileRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PublicProfilePage userId={id} />;
}
