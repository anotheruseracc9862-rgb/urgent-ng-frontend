import type { Metadata } from 'next';
import { ProfilePage } from '@/features/profile/profile-page';

export const metadata: Metadata = {
  title: 'Profile & account — Urgent.ng',
};

export default function ProfileRoute() {
  return <ProfilePage />;
}
