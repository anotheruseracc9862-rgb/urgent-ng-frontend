'use client';

import { useState } from 'react';
import { cn } from '@urgent/ui';
import { RevealSection } from '@/components/shared/reveal';
import { SectionHeader } from '@/components/shared/section-header';

type Role = 'requester' | 'runner';

const STEPS: Record<Role, { title: string; text: string }[]> = {
  requester: [
    {
      title: 'Post Your Request',
      text: 'Tell us what needs doing, where to pick up, where to deliver, and your preferred timing. Add photos and special instructions.',
    },
    {
      title: 'Receive Price Offers',
      text: 'Nearby available runners receive your alert and bid the exact price they will charge to get it done.',
    },
    {
      title: 'Choose Your Runner',
      text: 'Compare runner ratings, reviews, past completed tasks, and prices. Select the best match with one click.',
    },
    {
      title: 'Delivered & Paid',
      text: 'Your runner completes the errand. Once you inspect and confirm receipt, pay the runner directly via transfer or cash upon delivery.',
    },
  ],
  runner: [
    {
      title: 'Discover Nearby Tasks',
      text: 'See a real-time list of errand requests in your neighborhood (Lekki, Yaba, Ikeja, Garki, etc.) with clear distance estimates.',
    },
    {
      title: 'Submit Your Price',
      text: 'Set how much you want to charge and your expected delivery time. You are your own boss with zero forced pricing.',
    },
    {
      title: 'Run the Errand',
      text: 'When the requester accepts your offer, pick up the item, communicate clearly, deliver promptly, and collect payment upon delivery.',
    },
    {
      title: 'Direct Payment',
      text: 'Get paid directly by the requester upon completion via bank transfer or cash in hand with zero platform deductions.',
    },
  ],
};

const TABS: { role: Role; label: string }[] = [
  { role: 'requester', label: 'I Need an Errand Done (Requester)' },
  { role: 'runner', label: 'I Want to Earn (Runner)' },
];

export function HowItWorksSection() {
  const [role, setRole] = useState<Role>('requester');

  return (
    <RevealSection id="how-it-works" className="bg-[#f7f8f7] py-16 md:py-24">
      <div className="mx-auto w-full max-w-6xl px-4">
        <SectionHeader
          tag="Simple & Transparent"
          title="How Urgent.ng Works"
          subtitle="Whether you need something urgently handled or you want to make money running tasks in your spare time, the process is fast and seamless."
        />

        <div className="mb-10 flex justify-center">
          <div
            role="tablist"
            aria-label="Choose your role"
            className="inline-flex max-w-full flex-col gap-1 rounded-[28px] border border-cn-blue-100 bg-cn-blue-50 p-1 sm:flex-row sm:rounded-full"
          >
            {TABS.map((tab) => {
              const active = role === tab.role;
              return (
                <button
                  key={tab.role}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setRole(tab.role)}
                  className={cn(
                    'rounded-full px-6 py-2 text-sm font-semibold transition-all duration-200',
                    active
                      ? 'bg-white text-cn-blue-700 shadow-[0_2px_8px_rgba(16,21,31,0.08)]'
                      : 'text-cn-blue-500 hover:text-cn-blue-700',
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div key={role} role="tabpanel" className="tab-fade-slide grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS[role].map((step, index) => (
            <div key={step.title} className="card-lift flex flex-col gap-3.5 bg-white p-[22px]">
              <div className="icon-pop icon-fill grid size-11 place-items-center rounded-[14px] bg-[#eaf5cf] text-base font-extrabold text-[#3b5000]">
                {index + 1}
              </div>
              <h3 className="text-[17px] font-extrabold tracking-[-0.01em] text-ink">
                {index + 1}. {step.title}
              </h3>
              <p className="text-[13.5px] leading-normal text-muted">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </RevealSection>
  );
}
