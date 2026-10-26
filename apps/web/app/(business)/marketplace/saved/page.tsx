import type { Metadata } from 'next';
import { SavedErrandsPage } from '@/features/marketplace/saved/saved-errands-page';

export const metadata: Metadata = {
  title: 'Saved Errands — Urgent.ng',
};

export default function SavedErrandsRoute() {
  return <SavedErrandsPage />;
}
