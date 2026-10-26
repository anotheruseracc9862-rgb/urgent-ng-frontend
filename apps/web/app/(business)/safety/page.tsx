import type { Metadata } from 'next';
import { SafetyCenterPage } from '@/features/safety/safety-center-page';

export const metadata: Metadata = { title: 'Safety & support — Urgent.ng' };
export default async function Page({ searchParams }: { searchParams: Promise<{ assignmentId?: string }> }) {
  return <SafetyCenterPage assignmentId={(await searchParams).assignmentId} />;
}
