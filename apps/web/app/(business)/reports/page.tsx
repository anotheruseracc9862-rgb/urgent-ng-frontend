import type { Metadata } from 'next';
import { ReportsPage } from '@/features/safety/reports/reports-page';

export const metadata: Metadata = { title: 'Your reports — Urgent.ng' };
export default function Page() { return <ReportsPage />; }
