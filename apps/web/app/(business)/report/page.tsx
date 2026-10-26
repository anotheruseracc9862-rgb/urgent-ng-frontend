import type { Metadata } from 'next';
import { ReportPage } from '@/features/safety/reports/report-page';

export const metadata: Metadata = { title: 'Report a concern — Urgent.ng' };
export default async function Page({ searchParams }: { searchParams: Promise<{ targetType?: string; targetId?: string; assignmentId?: string }> }) {
  const values = await searchParams;
  return <ReportPage key={`${values.targetType}:${values.targetId}:${values.assignmentId}`} {...values} />;
}
