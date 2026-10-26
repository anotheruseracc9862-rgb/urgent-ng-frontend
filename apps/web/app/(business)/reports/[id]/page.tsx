import type { Metadata } from 'next';
import { ReportDetailPage } from '@/features/safety/reports/reports-page';

export const metadata: Metadata = { title: 'Report status — Urgent.ng' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ReportDetailPage reportId={(await params).id} />;
}
