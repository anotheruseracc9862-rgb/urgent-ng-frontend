'use client';

import { useState } from 'react';

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
  const [openIndex, setOpenIndex] = useState(0);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  return (
    <section id="faq" className="py-16 md:py-24 bg-cn-blue-50">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-block px-4 py-2 rounded-full bg-white text-cn-blue-700 text-sm font-medium mb-4">
            Got Questions?
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-cn-blue-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-cn-blue-600">
            Everything you need to know about posting and running errands.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {FAQS.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl border border-cn-blue-100 shadow-sm overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleFaq(index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-cn-blue-50 transition-colors"
              >
                <span className="font-semibold text-cn-blue-900 pr-4">{faq.question}</span>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`flex-shrink-0 text-cn-blue-400 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {openIndex === index && (
                <div className="px-6 pb-5">
                  <p className="text-cn-blue-600 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
