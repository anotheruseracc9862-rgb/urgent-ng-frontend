import type { Metadata } from 'next';
import { SharedErrandPage } from '@/features/safety/share/shared-errand-page';

export const metadata: Metadata = { title: 'Shared progress · Urgent.ng', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SharedErrandPage key={token} token={token} />;
}
