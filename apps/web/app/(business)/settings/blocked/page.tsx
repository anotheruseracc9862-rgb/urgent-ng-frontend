import type { Metadata } from 'next';
import { BlockedPeoplePage } from '@/features/blocks/blocked-people-page';

export const metadata: Metadata = {
  title: 'Blocked People — Urgent.ng',
};

export default function BlockedPeopleRoute() {
  return <BlockedPeoplePage />;
}
