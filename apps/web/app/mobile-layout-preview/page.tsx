'use client';

import { useSearchParams } from 'next/navigation';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { Topbar } from '@/components/shell/topbar';
import { BottomNav } from '@/components/shell/bottom-nav';
import { MyErrandsPage } from '@/features/errands/my-errands-page';
import { ErrandDetailPage } from '@/features/errands/detail/errand-detail-page';
import { PostErrandForm } from '@/features/errands/post-form/post-errand-form';
import { ErrandReviewPage } from '@/features/errands/review/errand-review-page';
import { CancelErrandPage } from '@/features/errands/cancel/cancel-errand-page';
import { ShareManagementPage } from '@/features/safety/share/share-management-page';
import { MyOffersPage } from '@/features/offers/list/my-offers-page';
import { OfferNegotiationPage } from '@/features/offers/negotiation/offer-negotiation-page';
import { SubmitOfferPage } from '@/features/offers/submit/submit-offer-page';
import { OfferJourney } from '@/features/journey/offer-journey';

export default function MobileLayoutPreview() {
  const search = useSearchParams();
  const screen = search.get('screen') ?? 'errands';
  const mode = ['offers', 'negotiation', 'submit'].includes(screen) && search.get('viewer') !== 'requester' ? 'RUNNER' : 'REQUESTER';
  const me = { id: mode === 'RUNNER' ? 'runner-1' : 'requester-1', name: 'Ada Okafor', firstName: 'Ada', photoMediaId: null, status: 'ACTIVE', startMode: mode } as Me;
  const pages: Record<string, React.ReactNode> = {
    errands: <MyErrandsPage />, detail: <ErrandDetailPage errandId="sample" />,
    new: <PostErrandForm />, edit: <PostErrandForm errandId="sample" />,
    review: <ErrandReviewPage errandId="sample" />,
    cancel: <CancelErrandPage errandId="sample" />, share: <ShareManagementPage errandId="sample" />,
    offers: <MyOffersPage />, negotiation: <OfferJourney offerId="offer-1"><OfferNegotiationPage offerId="offer-1" /></OfferJourney>,
    submit: <SubmitOfferPage errandId="sample" />,
  };
  return <SessionProvider me={me}><div className="grid min-h-screen gap-4 p-3 sm:p-4 lg:grid-cols-[276px_minmax(0,1fr)]"><aside className="hidden lg:block" /><div className="flex min-w-0 flex-col gap-4"><Topbar mode={mode} /><main id="preview-content" className="min-w-0 pb-24 lg:pb-10">{pages[screen]}</main></div></div><BottomNav mode={mode} /></SessionProvider>;
}
