import { RevealSection } from '@/components/shared/reveal';
import { SectionHeader } from '@/components/shared/section-header';

const FAQS = [
  {
    question: 'How do payments work? When do I pay the runner?',
    answer:
      'You pay the runner directly via bank transfer or cash only AFTER your errand is completed and you have inspected your items or receipts in hand. We strongly advise never sending money or advance fees upfront to any runner before the task is fulfilled.',
  },
  {
    question: 'Can one account both post errands and run errands?',
    answer:
      "Yes! Urgent.ng uses a unified single sign-on system. You can switch between Requester Mode (posting tasks) and Runner Mode (browsing errands to earn) right from your profile menu without creating separate accounts.",
  },
  {
    question: 'How does pricing work? Is there a fixed delivery fee?',
    answer:
      'No fixed fees! Urgent.ng is a free-market bidding platform. When you post an errand, nearby runners propose what they will charge based on traffic, distance, and urgency. You compare their prices, estimated times, and reputation, and choose the deal that fits your budget best.',
  },
  {
    question: 'How quickly do runners respond to requests?',
    answer:
      'In bustling commercial hubs like Ikeja, Victoria Island, Yaba, Lekki, and Surulere, you typically receive your first 2 to 4 price offers within 5 to 10 minutes of publishing your request.',
  },
  {
    question: 'How do runners receive payment?',
    answer:
      'You and the requester agree the amount and how to pay before work starts, usually cash or a bank transfer. The requester pays you directly. Urgent.ng does not collect, hold or release errand payments, so there is no wallet and nothing to withdraw.',
  },
];

export function FaqSection() {
  return (
    <RevealSection id="faq" className="py-16 md:py-24 bg-white">
      <div className="mx-auto w-full px-4 max-w-[800px]">
        <SectionHeader
          tag="Got Questions?"
          title="Frequently Asked Questions"
          subtitle="Everything you need to know about posting and running errands."
        />

        {/* Native <details name> gives an exclusive accordion with no client JavaScript. */}
        <div className="grid gap-4">
          {FAQS.map((faq, index) => (
            <details
              key={faq.question}
              name="faq"
              open={index === 0}
              className="group overflow-hidden rounded-[18px] border border-cn-blue-100 bg-white transition-[border-color,box-shadow] duration-200 hover:border-cn-green-500/35 open:border-cn-green-500 open:shadow-[0_6px_18px_-2px_rgba(133,196,36,0.12)]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-5 text-left transition-colors hover:bg-cn-green-50 [&::-webkit-details-marker]:hidden">
                <span className="pr-4 text-base font-semibold text-cn-blue-700">{faq.question}</span>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="shrink-0 text-cn-blue-400 transition-transform duration-300 group-open:rotate-180 group-open:text-cn-green-600"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </summary>
              <div className="bg-[#fbfbfb] px-6 pb-5 pt-1">
                <p className="text-sm leading-relaxed text-cn-blue-500">{faq.answer}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </RevealSection>
  );
}
