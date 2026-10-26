'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { Badge, Button, cn } from '@urgent/ui';

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
      'Flat screen 38 inches TV in crisp working condition with wall bracket & remote. Need trusted runner to inspect and deliver to buyer with payment on delivery.',
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

const FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'Price confirmation', label: 'Price confirmation' },
  { value: 'Sell fast', label: 'Sell fast' },
  { value: 'Delivery', label: 'Package Delivery' },
  { value: 'Shopping', label: 'Market & Shopping' },
  { value: 'Document', label: 'Urgent Documents' },
  { value: 'Food', label: 'Food & Cakes' },
  { value: 'Physical', label: 'In-Person Errand' },
];

/** Filter chips and cards: the interactive part of the live-errands section. */
export function LiveErrandsFeed() {
  const [filter, setFilter] = useState('all');
  const errands = filter === 'all' ? SAMPLE_ERRANDS : SAMPLE_ERRANDS.filter((e) => e.category === filter);

  return (
    <>
    <div className="mb-10 flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Filter errands">
      {FILTERS.map((chip) => {
        const active = filter === chip.value;
        return (
          <button
            key={chip.value}
            type="button"
            aria-pressed={active}
            onClick={() => setFilter(chip.value)}
            className={cn(
              'rounded-full border px-[18px] py-2 text-[13px] transition-all duration-200 hover:-translate-y-0.5',
              active
                ? 'scale-[1.04] border-cn-green-500 bg-cn-green-500 font-bold text-cn-blue-800 shadow-[0_4px_14px_rgba(133,196,36,0.25)]'
                : 'border-cn-blue-100 bg-white font-semibold text-cn-blue-600 hover:border-cn-blue-300 hover:shadow-[0_4px_12px_rgba(16,21,31,0.06)]',
            )}
          >
            {chip.label}
          </button>
        );
      })}
    </div>

    <div key={filter} className="tab-fade-slide mb-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {errands.map((errand) => (
        <article key={errand.id} className="card-lift flex flex-col gap-3.5 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Badge variant={CATEGORY_BADGES[errand.category] ?? 'default'}>{errand.category}</Badge>
              <h3 className="mt-2.5 text-base font-extrabold leading-[1.35] tracking-[-0.01em] text-ink">
                {errand.title}
              </h3>
            </div>
            <Badge variant="amber" className="shrink-0">
              {errand.offers} Offers
            </Badge>
          </div>

          <div className="grid gap-2.5 rounded-xl bg-panel px-3.5 py-3 text-[13px] text-ink-2">
            <div className="flex items-start gap-2.5">
              <span className="mt-[5px] size-2.5 shrink-0 rounded-full bg-cn-green-500" />
              <span>
                <strong>{errand.task || !errand.dropoff ? 'Location' : 'Pickup'}:</strong> {errand.pickup}
              </span>
            </div>
            {errand.task || errand.dropoff ? (
              <div className="flex items-start gap-2.5">
                <span className="mt-[5px] size-2.5 shrink-0 rounded-full bg-ink" />
                <span>
                  <strong>{errand.task ? 'Task' : 'Drop-off'}:</strong> {errand.task || errand.dropoff}
                </span>
              </div>
            ) : null}
          </div>

          <p className="line-clamp-2 flex-1 text-[13px] leading-[1.55] text-muted">{errand.description}</p>

          <div className="flex items-center justify-between text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" /> {errand.urgency}
            </span>
            <span>{errand.postedAgo}</span>
          </div>

          <div className="flex items-end justify-between gap-3">
            <div>
              <span className="block text-[11px] font-semibold text-muted">
                {errand.category === 'Shopping' ? 'Runner fee' : 'Suggested budget'}
              </span>
              <span className="text-xl font-extrabold tracking-[-0.03em] text-ink">
                ₦{errand.budget.toLocaleString()}
              </span>
            </div>
            <Button size="sm" asChild>
              <Link href="/register?mode=runner">Make an Offer</Link>
            </Button>
          </div>
        </article>
      ))}
    </div>
    </>
  );
}
