import type { Metadata } from 'next';
import { RunnerHistoryPage } from '@/features/runner/history/runner-history-page';

export const metadata: Metadata = {
  title: 'Runner History — Urgent.ng',
};

export default function RunnerHistoryRoute() {
  return <RunnerHistoryPage />;
}
