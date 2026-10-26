import type { Metadata } from 'next';
import { RunnerProfilePage } from '@/features/runner/runner-profile-page';

export const metadata: Metadata = {
  title: 'Runner Profile & Area — Urgent.ng',
};

export default function RunnerProfileRoute() {
  return <RunnerProfilePage />;
}
