import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@urgent/ui';
import { formatMoney } from '@urgent/utils';

export const metadata: Metadata = {
  title: 'Pricing — Urgent.ng',
  description: 'Simple, transparent pricing for Urgent.ng services',
};

// This would fetch from GET /billing/products/public in production
// For now, using static data matching the expected structure
const PRODUCTS = [
  {
    code: 'RUNNER_PRO_MONTHLY',
    name: 'Runner Pro (Monthly)',
    orderType: 'RUNNER_PRO' as const,
    priceMinor: 299900, // ₦2,999 in kobo
    vatMinor: 45000, // VAT included
    currency: 'NGN',
    periodDays: 30,
  },
  {
    code: 'VERIFICATION_FEE',
    name: 'Identity Verification',
    orderType: 'VERIFICATION_FEE' as const,
    priceMinor: 250000, // ₦2,500 in kobo
    vatMinor: 37500, // VAT included
    currency: 'NGN',
    periodDays: null,
  },
  {
    code: 'BOOST_24H',
    name: 'Errand Boost (24 hours)',
    orderType: 'BOOST' as const,
    priceMinor: 149900, // ₦1,499 in kobo
    vatMinor: 22500,
    currency: 'NGN',
    periodDays: 1,
  },
];

export default function PricingPage() {
  return (
    <div className="py-16 bg-cn-blue-50">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-cn-blue-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-cn-blue-600 max-w-2xl mx-auto">
            No hidden fees. Pay only for what you use. All prices include VAT.
          </p>
        </div>

        {/* Free for Basic Use */}
        <div className="bg-white rounded-3xl p-8 md:p-12 text-center mb-12 shadow-lg">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cn-green-100 mb-6">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-cn-green-700"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-cn-blue-900 mb-4">
            Free to Post Errands & Run 10 Errands Daily
          </h2>
          <p className="text-lg text-cn-blue-600 max-w-3xl mx-auto mb-6">
            Requesters never pay platform fees. Runners can send up to 10 free offers per day.
            Payment happens directly between users—Urgent.ng never touches your errand money.
          </p>
          <Button size="lg" asChild>
            <Link href="/register">Get Started Free</Link>
          </Button>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Runner Pro */}
          <div className="bg-white rounded-3xl p-8 shadow-lg border-2 border-cn-green-600">
            <div className="text-center mb-6">
              <div className="inline-block px-3 py-1 bg-cn-green-100 text-cn-green-700 text-xs font-bold rounded-full mb-4">
                MOST POPULAR
              </div>
              <h3 className="text-2xl font-bold text-cn-blue-900 mb-2">Runner Pro</h3>
              <div className="text-4xl font-bold text-cn-blue-900 mb-2">
                {formatMoney(PRODUCTS[0].priceMinor)}
                <span className="text-lg font-normal text-cn-blue-600">/month</span>
              </div>
              <p className="text-sm text-cn-blue-600">
                VAT included: {formatMoney(PRODUCTS[0].vatMinor)}
              </p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-cn-green-600 flex-shrink-0 mt-0.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-cn-blue-700">
                  <strong>Unlimited daily offers</strong> — No caps
                </span>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-cn-green-600 flex-shrink-0 mt-0.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-cn-blue-700">Priority in search results</span>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-cn-green-600 flex-shrink-0 mt-0.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-cn-blue-700">Pro badge on your profile</span>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-cn-green-600 flex-shrink-0 mt-0.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-cn-blue-700">Advanced analytics dashboard</span>
              </li>
            </ul>

            <Button className="w-full" asChild>
              <Link href="/register?mode=runner">Subscribe Now</Link>
            </Button>
          </div>

          {/* Verification Fee */}
          <div className="bg-white rounded-3xl p-8 shadow-lg">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-cn-blue-900 mb-2">Identity Verification</h3>
              <div className="text-4xl font-bold text-cn-blue-900 mb-2">
                {formatMoney(PRODUCTS[1].priceMinor)}
              </div>
              <p className="text-sm text-cn-blue-600">
                One-time fee (VAT: {formatMoney(PRODUCTS[1].vatMinor)})
              </p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-cn-green-600 flex-shrink-0 mt-0.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-cn-blue-700">NIN verification check</span>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-cn-green-600 flex-shrink-0 mt-0.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-cn-blue-700">Selfie verification</span>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-cn-green-600 flex-shrink-0 mt-0.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-cn-blue-700">Verified badge forever</span>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-cn-green-600 flex-shrink-0 mt-0.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-cn-blue-700">Higher trust from requesters</span>
              </li>
            </ul>

            <Button variant="ghost" className="w-full border border-cn-blue-200" asChild>
              <Link href="/register?mode=runner">Get Verified</Link>
            </Button>
          </div>

          {/* Boost */}
          <div className="bg-white rounded-3xl p-8 shadow-lg">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-cn-blue-900 mb-2">Errand Boost</h3>
              <div className="text-4xl font-bold text-cn-blue-900 mb-2">
                {formatMoney(PRODUCTS[2].priceMinor)}
              </div>
              <p className="text-sm text-cn-blue-600">
                Per 24 hours (VAT: {formatMoney(PRODUCTS[2].vatMinor)})
              </p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-cn-green-600 flex-shrink-0 mt-0.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-cn-blue-700">
                  <strong>Featured at the top</strong> of search
                </span>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-cn-green-600 flex-shrink-0 mt-0.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-cn-blue-700">Highlighted with a badge</span>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-cn-green-600 flex-shrink-0 mt-0.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-cn-blue-700">Up to 3× more runner views</span>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-cn-green-600 flex-shrink-0 mt-0.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-cn-blue-700">Faster offers received</span>
              </li>
            </ul>

            <Button variant="ghost" className="w-full border border-cn-blue-200" asChild>
              <Link href="/register">Boost an Errand</Link>
            </Button>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-3xl p-8 md:p-12">
          <h2 className="text-2xl font-bold text-cn-blue-900 mb-8 text-center">
            Pricing Questions
          </h2>
          <div className="space-y-6 max-w-3xl mx-auto">
            <div>
              <h3 className="font-bold text-cn-blue-900 mb-2">
                Do requesters pay any platform fees?
              </h3>
              <p className="text-cn-blue-700">
                No. Requesters post errands for free and pay runners directly. Urgent.ng never
                charges requesters or takes a cut of errand payments.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-cn-blue-900 mb-2">
                What happens to my Runner Pro subscription if I don&apos;t use it?
              </h3>
              <p className="text-cn-blue-700">
                It continues until you cancel. There are no refunds for unused time, but you can
                cancel anytime and your benefits continue until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-cn-blue-900 mb-2">How do I pay for services?</h3>
              <p className="text-cn-blue-700">
                We accept card payments and bank transfers through Paystack. All prices shown
                include VAT.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-cn-blue-900 mb-2">
                Is verification required to be a runner?
              </h3>
              <p className="text-cn-blue-700">
                Yes. Identity verification protects both requesters and runners. The ₦2,500
                one-time fee covers NIN checks and manual review.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
