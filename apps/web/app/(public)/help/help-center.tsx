'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@urgent/ui';

const CATEGORIES = ['All', 'Payments', 'Getting started', 'Safety', 'Account', 'Runners'] as const;

const FAQS: { c: (typeof CATEGORIES)[number]; q: string; a: string }[] = [
  { c: 'Payments', q: 'How does payment work? When do I pay?', a: 'You and the runner agree the amount and the method before work starts, usually cash or a bank transfer, and you pay the runner directly. Urgent.ng never holds or releases that money.' },
  { c: 'Payments', q: 'Is there a wallet or a payout?', a: 'No. Because payment goes straight from the requester to the runner, there is no wallet to top up and nothing to withdraw.' },
  { c: 'Payments', q: 'What does Urgent.ng charge?', a: 'Only two optional things: Runner Pro (₦5,000 for 30 days) and an errand boost (₦1,000 for higher placement). Posting an errand and sending offers up to your daily limit are free.' },
  { c: 'Payments', q: 'What if we disagree about the amount after the job?', a: 'Open Safety & support and report a payment disagreement. Our team reviews it. We cannot move money, but a pattern of non-payment can lead to restrictions.' },
  { c: 'Getting started', q: 'Can one account both post errands and run errands?', a: 'Yes. Switch between Requester and Runner from the top bar. You only need to verify your identity once, and only if you want to run errands.' },
  { c: 'Getting started', q: 'How do I post an errand?', a: 'Choose Post an errand, describe the task, add pickup and drop-off areas, set a suggested budget and review it. Runners nearby are notified and send offers.' },
  { c: 'Getting started', q: 'How do offers and counter-offers work?', a: 'A runner sends a price. You can select it, decline it or counter. The runner then accepts, declines or counters back. Only the person whose turn it is can respond, up to 6 rounds.' },
  { c: 'Getting started', q: 'What happens after I select a runner?', a: 'The runner has 30 minutes to accept. Once they accept, exact addresses and contacts are shared and you agree payment terms. If they do not answer, the errand goes back to open.' },
  { c: 'Safety', q: 'How do I stay safe?', a: 'Every runner is identity-checked before they can send offers. Keep chat inside Urgent.ng, never share one-time codes, and use the trusted-contact link to let someone follow progress.' },
  { c: 'Safety', q: 'How do I report a problem or open a dispute?', a: 'Open Safety & support from your account menu. Reports cover behaviour and safety. Disputes cover an errand that went wrong, such as an item not delivered or damaged, and pause automatic completion.' },
  { c: 'Safety', q: 'What can I do if a runner does not show up?', a: 'You can cancel the errand and report a no-show. The cancellation reason is recorded for both sides, and a late runner cancellation is flagged.' },
  { c: 'Account', q: 'How do I change my notification settings?', a: 'Open Notification settings from your account menu. You can choose categories, quiet hours and devices. Safety and account notices are always on.' },
  { c: 'Account', q: 'How do I close my account?', a: 'Open Profile & account, then Deactivate or delete. Deactivation is reversible. Deletion starts a 14-day grace period. You must finish or cancel active errands first.' },
  { c: 'Runners', q: 'Why do I need to verify my identity?', a: 'Verification builds trust and is required before you can send offers. You submit your details, an ID and a selfie. Most reviews finish in 2 to 4 hours.' },
  { c: 'Runners', q: 'How many offers can I send?', a: 'Free runners have a daily limit on new offers. Your remaining offers show on your dashboard and on My offers. Editing an offer or answering a counter-offer does not use another. Runner Pro gives you a much higher daily limit.' },
];

export function HelpCenter() {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All');
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQS.filter(
      (f) => (category === 'All' || f.c === category) && (!q || `${f.q} ${f.a}`.toLowerCase().includes(q)),
    );
  }, [category, query]);

  return (
    <div className="text-left">
      <label className="relative mx-auto mt-6 block max-w-[560px]">
        <span className="sr-only">Search help</span>
        <Search className="pointer-events-none absolute left-[18px] top-4 size-5 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a question"
          className="h-[52px] w-full rounded-full bg-surface pl-12 pr-5 text-[15px] shadow-[var(--shadow)] focus:outline-none focus:shadow-[var(--shadow),0_0_0_4px_rgba(166,212,69,0.3)]"
        />
      </label>

      <div className="mb-3.5 mt-8 flex flex-wrap gap-2" role="group" aria-label="Filter by topic">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
            className={cn(
              'rounded-full px-3.5 py-2 text-[12.5px] font-bold transition-colors',
              category === c
                ? 'bg-ink text-white'
                : 'bg-surface text-ink-2 shadow-[inset_0_0_0_1px_var(--line)] hover:bg-panel',
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid gap-2.5">
        {shown.map((f) => (
          <details key={f.q} className="group rounded-[var(--r)] bg-surface shadow-[var(--shadow)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-[18px] py-4 font-bold [&::-webkit-details-marker]:hidden">
              {f.q}
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-panel text-lg leading-none transition-colors group-open:bg-lime">
                <span className="group-open:hidden">+</span>
                <span className="hidden group-open:inline">–</span>
              </span>
            </summary>
            <div className="px-[18px] pb-[18px] leading-[1.7] text-ink-2">{f.a}</div>
          </details>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="mt-3 rounded-[var(--r-lg)] bg-surface p-[22px] text-center shadow-[var(--shadow)]">
          <b>No answers match that search.</b>
          <p className="mt-1 text-muted">Try different words, or contact support below.</p>
        </div>
      ) : null}
    </div>
  );
}
