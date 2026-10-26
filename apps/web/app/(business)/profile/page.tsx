import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ProfilePage } from '@/features/profile/profile-page';
import { getActiveMode, getSession } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Profile & account — Urgent.ng',
};

export default async function ProfileRoute() {
  const me = await getSession();
  if (!me) redirect('/session?redirect=%2Fprofile');

  return <ProfilePage mode={await getActiveMode(me)} />;
}
