import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { isApiError, api } from '@/lib/api/client';
import type { RunnerEligibility } from '@/features/runner/api';
import { MarketplaceEligibilityError, MarketplacePage } from '@/features/marketplace/marketplace-page';

export const metadata: Metadata = {
  title: 'Marketplace — Urgent.ng',
};

export default async function MarketplaceRoute() {
  const cookie = (await cookies()).getAll().map(({ name, value }) => `${name}=${value}`).join('; ');
  let eligibility: RunnerEligibility;

  try {
    eligibility = await api<RunnerEligibility>('/runner/eligibility', { cookie });
  } catch (error) {
    if (!isApiError(error)) throw error;
    return <MarketplaceEligibilityError requestId={error.requestId} />;
  }

  return <MarketplacePage eligibility={eligibility} />;
}
