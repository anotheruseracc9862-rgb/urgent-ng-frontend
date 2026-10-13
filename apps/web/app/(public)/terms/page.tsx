import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Urgent.ng',
  description: 'Terms and conditions for using Urgent.ng errand marketplace',
};

export default function TermsPage() {
  return (
    <div className="py-16 bg-white">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-cn-blue-900 mb-4">
            Terms of Service
          </h1>
          <div className="flex items-center gap-4 text-sm text-cn-blue-600">
            <span>Version 1.0</span>
            <span>•</span>
            <span>Effective: January 1, 2026</span>
          </div>
        </div>

        <div className="prose prose-lg max-w-none">
          <div className="bg-cn-blue-50 border-l-4 border-cn-green-600 p-6 rounded-r-lg mb-8">
            <p className="font-semibold text-cn-blue-900 mb-2">Important Notice</p>
            <p className="text-cn-blue-700 text-sm mb-0">
              These terms govern your use of Urgent.ng. By creating an account or using our
              services, you agree to these terms. Please read them carefully.
            </p>
          </div>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-cn-blue-900 mb-4">1. About Urgent.ng</h2>
            <p className="text-cn-blue-700 leading-relaxed mb-4">
              Urgent.ng is a peer-to-peer marketplace platform that connects people who need
              errands completed (&quot;Requesters&quot;) with independent service providers
              (&quot;Runners&quot;) who can fulfill those errands.
            </p>
            <p className="text-cn-blue-700 leading-relaxed">
              We are an intermediary platform only. We do not employ Runners, perform errands, or
              control the actions of platform users. All errand agreements are directly between
              Requesters and Runners.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-cn-blue-900 mb-4">2. Eligibility</h2>
            <p className="text-cn-blue-700 leading-relaxed mb-4">
              To use Urgent.ng, you must:
            </p>
            <ul className="list-disc pl-6 text-cn-blue-700 space-y-2">
              <li>Be at least 18 years old</li>
              <li>Have the legal capacity to enter into binding contracts</li>
              <li>Reside in Nigeria</li>
              <li>Provide accurate and complete registration information</li>
              <li>Not be prohibited from using our services under Nigerian law</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-cn-blue-900 mb-4">
              3. Account Registration and Security
            </h2>
            <p className="text-cn-blue-700 leading-relaxed mb-4">
              You are responsible for:
            </p>
            <ul className="list-disc pl-6 text-cn-blue-700 space-y-2">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized access</li>
              <li>Ensuring your account information remains accurate and up-to-date</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-cn-blue-900 mb-4">4. Payment Terms</h2>
            <p className="text-cn-blue-700 leading-relaxed mb-4">
              <strong>Pay-on-Delivery Model:</strong> All errand payments are made directly
              between Requesters and Runners. Urgent.ng does not process, hold, or manage errand
              payments.
            </p>
            <p className="text-cn-blue-700 leading-relaxed mb-4">
              <strong>Platform Fees:</strong> Runner Pro subscriptions, verification fees, and
              boost purchases are processed through our payment provider (Paystack) and are
              non-refundable except as required by law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-cn-blue-900 mb-4">5. Prohibited Activities</h2>
            <p className="text-cn-blue-700 leading-relaxed mb-4">
              You may not use Urgent.ng to:
            </p>
            <ul className="list-disc pl-6 text-cn-blue-700 space-y-2">
              <li>Transport illegal goods or contraband</li>
              <li>Engage in fraudulent or deceptive practices</li>
              <li>Harass, threaten, or abuse other users</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Circumvent platform fees or verification requirements</li>
              <li>Create multiple accounts to manipulate the system</li>
              <li>Post errands for prohibited items (weapons, drugs, counterfeit goods, etc.)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-cn-blue-900 mb-4">
              6. Limitation of Liability
            </h2>
            <p className="text-cn-blue-700 leading-relaxed mb-4">
              Urgent.ng is not liable for:
            </p>
            <ul className="list-disc pl-6 text-cn-blue-700 space-y-2">
              <li>Loss, damage, or theft of items during errand execution</li>
              <li>Injuries or damages arising from errand activities</li>
              <li>Disputes between Requesters and Runners</li>
              <li>Quality, safety, or legality of services provided by Runners</li>
              <li>Actions or inactions of platform users</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-cn-blue-900 mb-4">7. Dispute Resolution</h2>
            <p className="text-cn-blue-700 leading-relaxed mb-4">
              If a dispute arises between users, we provide a mediation service to help reach a
              fair resolution. However, we cannot force any particular outcome.
            </p>
            <p className="text-cn-blue-700 leading-relaxed">
              For disputes with Urgent.ng itself, Nigerian law governs and courts in Lagos have
              exclusive jurisdiction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-cn-blue-900 mb-4">8. Account Termination</h2>
            <p className="text-cn-blue-700 leading-relaxed mb-4">
              We may suspend or terminate your account if you:
            </p>
            <ul className="list-disc pl-6 text-cn-blue-700 space-y-2">
              <li>Violate these terms</li>
              <li>Engage in fraudulent or abusive behavior</li>
              <li>Fail verification requirements</li>
              <li>Accumulate excessive reliability violations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-cn-blue-900 mb-4">
              9. Changes to These Terms
            </h2>
            <p className="text-cn-blue-700 leading-relaxed">
              We may update these terms from time to time. We will notify you of material changes
              and require your acceptance before you can continue using the platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-cn-blue-900 mb-4">10. Contact Us</h2>
            <p className="text-cn-blue-700 leading-relaxed">
              Questions about these terms? Contact us at{' '}
              <a href="mailto:legal@urgent.ng" className="text-cn-green-600 hover:underline">
                legal@urgent.ng
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
