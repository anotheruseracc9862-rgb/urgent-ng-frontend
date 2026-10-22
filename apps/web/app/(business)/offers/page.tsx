import type { Metadata } from 'next';
import { MyOffersPage } from '@/features/offers/list/my-offers-page';
import { RequesterOffersPage } from '@/features/offers/list/requester-offers-page';
import { getActiveMode, getSession } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Offers — Urgent.ng',
};

/** One address, two views: a runner's own offers, or the offers on a requester's errands, by the mode they are in. */
export default async function OffersRoute() {
  const me = await getSession();
  const mode = me ? await getActiveMode(me) : 'RUNNER';
  return mode === 'REQUESTER' ? <RequesterOffersPage /> : <MyOffersPage />;
}
