import Link from 'next/link';
import { Badge, Button } from '@urgent/ui';

// Sample errands data - in production this could come from API
const SAMPLE_ERRANDS = [
  {
    id: '1',
    title: 'Confirm price of 32 inch TV in Alaba market',
    category: 'Price confirmation',
    pickup: 'Electronics Section, Alaba Int\'l Market',
    task: 'Verify prices of 32" TVs & video call from shop',
    description:
      'Need an honest runner on ground to check current retail & wholesale prices for 32 inch TVs across 3 major shops.',
    urgency: 'Within 2 hours',
    postedAgo: '6m ago',
    budget: 3500,
    offers: 4,
  },
  {
    id: '2',
    title: 'Sell my flat screen 38 inches TV',
    category: 'Sell fast',
    pickup: '14 Admiralty Way, Lekki Phase 1',
    dropoff: 'Buyer destination in Lagos',
    description:
      'Flat screen 38 inches TV in crisp working condition with wall bracket & remote. Need trusted runner to inspect and deliver to buyer with safe payment on delivery.',
    urgency: 'Today ASAP',
    postedAgo: '14m ago',
    budget: 5000,
    offers: 2,
  },
  {
    id: '3',
    title: 'Confirm price of iPhone 15 Pro at Computer Village',
    category: 'Price confirmation',
    pickup: 'Otigba Street, Computer Village, Ikeja',
    task: 'Verify genuine prices across 2 trusted shops',
    description:
      'Need a tech-savvy runner on Otigba Street to cross-check genuine prices and battery health warranties before purchase.',
    urgency: 'Within 1 hour',
    postedAgo: '4m ago',
    budget: 3000,
    offers: 3,
  },
  {
    id: '4',
    title: 'Collect Laptop Charger left at Coworking Space',
    category: 'Delivery',
    pickup: 'Workstation, Victoria Island',
    dropoff: 'Admiralty Way, Lekki 1',
    description: 'HP USB-C 65W charger with cable in an envelope at front desk.',
    urgency: 'Needed within 1 hr',
    postedAgo: '12m ago',
    budget: 2500,
    offers: 3,
  },
  {
    id: '5',
    title: 'Buy Fresh Seafood & Catfish from Tejuosho',
    category: 'Shopping',
    pickup: 'Tejuosho Ultra-Modern Market, Yaba',
    dropoff: 'Surulere, Bode Thomas',
    description:
      'I will settle the item cost and your fee with you directly once the shopping is done and I have seen the receipt.',
    urgency: 'Complete before 3:00 PM',
    postedAgo: '25m ago',
    budget: 4000,
    offers: 5,
  },
  {
    id: '6',
    title: 'Urgent High Court Certified True Copy (CTC)',
    category: 'Document',
    pickup: 'Lagos High Court, Igbosere',
    dropoff: 'Law Chambers, Marina',
    description: 'Document is already stamped and ready with Registrar Room 12.',
    urgency: 'ASAP / Immediate',
    postedAgo: '6m ago',
    budget: 3500,
    offers: 2,
  },
];

const CATEGORY_BADGES: Record<string, 'default' | 'green' | 'lime' | 'blue' | 'amber' | 'red' | 'violet' | 'dark'> = {
  'Price confirmation': 'amber',
  'Sell fast': 'green',
  Delivery: 'blue',
  Shopping: 'green',
  Document: 'amber',
  Food: 'default',
  Physical: 'default',
};

export function LiveErrandsSection() {
  return (
    <section id="live-errands" className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-block px-4 py-2 rounded-full bg-cn-blue-50 text-cn-blue-700 text-sm font-medium mb-4">
            Marketplace Feed
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-cn-blue-900 mb-4">
            Active Errands Happening Now
          </h2>
          <p className="text-lg text-cn-blue-600 max-w-3xl mx-auto">
            Real errands posted by everyday people and businesses across Nigeria. See what&apos;s
            moving right now.
          </p>
        </div>

        {/* Errands Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {SAMPLE_ERRANDS.map((errand) => (
            <div
              key={errand.id}
              className="bg-white rounded-2xl border border-cn-blue-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-cn-blue-100">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <Badge variant={CATEGORY_BADGES[errand.category]} className="mb-2">
                      {errand.category}
                    </Badge>
                    <h3 className="font-bold text-cn-blue-900 text-base leading-snug">
                      {errand.title}
                    </h3>
                  </div>
                  <Badge variant="amber" className="flex-shrink-0">
                    {errand.offers} Offers
                  </Badge>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* Route */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-cn-green-500 mt-1.5 flex-shrink-0" />
                    <span className="text-cn-blue-700">
                      <strong>
                        {errand.task ? 'Location' : errand.dropoff ? 'Pickup' : 'Location'}:
                      </strong>{' '}
                      {errand.pickup}
                    </span>
                  </div>
                  {(errand.task || errand.dropoff) && (
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-cn-blue-500 mt-1.5 flex-shrink-0" />
                      <span className="text-cn-blue-700">
                        <strong>{errand.task ? 'Task' : 'Drop-off'}:</strong>{' '}
                        {errand.task || errand.dropoff}
                      </span>
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-cn-blue-800 line-clamp-2">{errand.description}</p>

                {/* Meta */}
                <div className="flex items-center gap-3 text-xs text-cn-blue-600">
                  <span>⏱️ {errand.urgency}</span>
                  <span>Posted {errand.postedAgo}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 bg-cn-blue-50 flex items-center justify-between">
                <div>
                  <div className="text-xs text-cn-blue-600 mb-1">
                    {errand.category === 'Shopping' ? 'Runner Fee' : 'Suggested Budget'}
                  </div>
                  <div className="text-lg font-bold text-cn-blue-900">
                    ₦{errand.budget.toLocaleString()}
                  </div>
                </div>
                <Button size="sm" asChild>
                  <Link href="/register">Make an Offer</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* View More Button */}
        <div className="text-center">
          <Button size="lg" variant="ghost" className="border border-cn-blue-200" asChild>
            <Link href="/marketplace">View More →</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
