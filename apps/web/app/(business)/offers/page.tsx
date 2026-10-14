import type { Metadata } from 'next';
import { MyOffersPage } from '@/features/offers/list/my-offers-page';

export const metadata: Metadata = {
  title: 'My Offers — Urgent.ng',
};

export default function OffersRoute() {
  return <MyOffersPage />;
}
