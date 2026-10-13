import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Help Centre — Urgent.ng',
  description: 'Get help and find answers to common questions about using Urgent.ng',
};

export default function HelpPage() {
  return (
    <div className="py-16 bg-white">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-cn-blue-900 mb-4">
            How Can We Help You?
          </h1>
          <p className="text-lg text-cn-blue-600 max-w-2xl mx-auto">
            Find answers to common questions or get in touch with our support team
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Link
            href="/#how-it-works"
            className="p-6 bg-cn-blue-50 rounded-2xl hover:bg-cn-blue-100 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-cn-green-100 flex items-center justify-center mb-4">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-cn-green-700"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-cn-blue-900 mb-2">How It Works</h3>
            <p className="text-sm text-cn-blue-600">
              Learn the basics of posting errands and earning as a runner
            </p>
          </Link>

          <Link
            href="/#trust-safety"
            className="p-6 bg-cn-blue-50 rounded-2xl hover:bg-cn-blue-100 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-cn-green-100 flex items-center justify-center mb-4">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-cn-green-700"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-cn-blue-900 mb-2">Safety Tips</h3>
            <p className="text-sm text-cn-blue-600">
              Best practices for safe and secure errand transactions
            </p>
          </Link>

          <Link
            href="/#faq"
            className="p-6 bg-cn-blue-50 rounded-2xl hover:bg-cn-blue-100 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-cn-green-100 flex items-center justify-center mb-4">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-cn-green-700"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-cn-blue-900 mb-2">FAQ</h3>
            <p className="text-sm text-cn-blue-600">
              Answers to the most frequently asked questions
            </p>
          </Link>
        </div>

        {/* Common Topics */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-cn-blue-900 mb-6">Common Topics</h2>
          <div className="space-y-4">
            <details className="bg-white border border-cn-blue-100 rounded-xl overflow-hidden">
              <summary className="px-6 py-4 cursor-pointer hover:bg-cn-blue-50 font-semibold text-cn-blue-900">
                Getting Started as a Requester
              </summary>
              <div className="px-6 py-4 bg-cn-blue-50 text-cn-blue-700 space-y-3">
                <p>
                  1. <strong>Create an account</strong> with your phone number or email
                </p>
                <p>
                  2. <strong>Post your errand</strong> with pickup/delivery details and your budget
                </p>
                <p>
                  3. <strong>Review offers</strong> from verified runners nearby
                </p>
                <p>
                  4. <strong>Select a runner</strong> based on their rating, price, and ETA
                </p>
                <p>
                  5. <strong>Track progress</strong> and communicate through in-app chat
                </p>
                <p>
                  6. <strong>Pay on delivery</strong> after inspecting your items
                </p>
              </div>
            </details>

            <details className="bg-white border border-cn-blue-100 rounded-xl overflow-hidden">
              <summary className="px-6 py-4 cursor-pointer hover:bg-cn-blue-50 font-semibold text-cn-blue-900">
                Getting Started as a Runner
              </summary>
              <div className="px-6 py-4 bg-cn-blue-50 text-cn-blue-700 space-y-3">
                <p>
                  1. <strong>Register</strong> and verify your identity (NIN verification)
                </p>
                <p>
                  2. <strong>Set your area</strong> and the types of errands you want to run
                </p>
                <p>
                  3. <strong>Browse available errands</strong> near you
                </p>
                <p>
                  4. <strong>Send offers</strong> with your price and estimated time
                </p>
                <p>
                  5. <strong>Accept assignments</strong> when requesters choose you
                </p>
                <p>
                  6. <strong>Complete errands</strong> and get paid directly by the requester
                </p>
              </div>
            </details>

            <details className="bg-white border border-cn-blue-100 rounded-xl overflow-hidden">
              <summary className="px-6 py-4 cursor-pointer hover:bg-cn-blue-50 font-semibold text-cn-blue-900">
                Payment and Pricing
              </summary>
              <div className="px-6 py-4 bg-cn-blue-50 text-cn-blue-700 space-y-3">
                <p>
                  <strong>For Requesters:</strong> You pay runners directly via bank transfer or
                  cash after the errand is complete. Urgent.ng does not hold your money.
                </p>
                <p>
                  <strong>For Runners:</strong> You set your own prices. There are no platform
                  commissions on errand payments. Optional Runner Pro subscription unlocks
                  unlimited daily offers.
                </p>
                <p>
                  <strong>Verification Fee:</strong> One-time ₦2,500 fee for runner identity
                  verification.
                </p>
              </div>
            </details>

            <details className="bg-white border border-cn-blue-100 rounded-xl overflow-hidden">
              <summary className="px-6 py-4 cursor-pointer hover:bg-cn-blue-50 font-semibold text-cn-blue-900">
                Safety and Trust
              </summary>
              <div className="px-6 py-4 bg-cn-blue-50 text-cn-blue-700 space-y-3">
                <p>
                  <strong>Identity Verification:</strong> All runners verify their identity with
                  NIN before accepting errands.
                </p>
                <p>
                  <strong>Ratings System:</strong> Both requesters and runners rate each other
                  after every errand.
                </p>
                <p>
                  <strong>Dispute Resolution:</strong> Our team mediates disputes between users to
                  reach fair outcomes.
                </p>
                <p>
                  <strong>Safety Tips:</strong> Always meet in public places, inspect items before
                  paying, and keep communication in-app.
                </p>
              </div>
            </details>
          </div>
        </div>

        {/* Contact Support */}
        <div className="bg-cn-green-50 rounded-3xl p-8 md:p-12 text-center">
          <h2 className="text-2xl font-bold text-cn-blue-900 mb-4">Still Need Help?</h2>
          <p className="text-cn-blue-700 mb-6 max-w-2xl mx-auto">
            Our support team is here to help. Reach out and we&apos;ll get back to you as soon as
            possible.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:support@urgent.ng"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-cn-green-600 text-white rounded-full font-bold hover:bg-cn-green-700 transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Email Support
            </a>
            <a
              href="https://wa.me/2348012345678"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-cn-blue-900 rounded-full font-bold border-2 border-cn-blue-200 hover:bg-cn-blue-50 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
