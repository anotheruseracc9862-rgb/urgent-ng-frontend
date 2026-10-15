import type { Metadata } from 'next';
import { BoostsPage } from '@/features/billing/boosts-page';

export const metadata: Metadata = { title: 'Boosts — Urgent.ng' };

export default async function BoostsRoute({ searchParams }: { searchParams: Promise<{ errandId?: string }> }) {
  const { errandId } = await searchParams;
  return <BoostsPage errandId={errandId} />;
}
