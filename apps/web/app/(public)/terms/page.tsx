import { formatPolicyDate, getPolicy } from '@/lib/api/policies';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Urgent.ng',
  description: 'Terms and conditions for using Urgent.ng errand marketplace',
};

export default async function TermsPage() {
  const policy = await getPolicy('TERMS_OF_SERVICE');
  return (
    <div className="py-10 md:py-14">
      <div className="mx-auto w-full px-4 max-w-[880px]">
        <div className="mb-12">
          <h1 className="text-[28px] font-extrabold leading-[1.12] tracking-[-0.03em] text-ink md:text-[40px] mb-3">
            Terms of Service
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted">
            <span>{policy ? `Version ${policy.version}` : 'Current version'}</span>
            <span>•</span>
            <span>{policy ? `Published ${formatPolicyDate(policy.publishedAt)}` : ''}</span>
          </div>
        </div>

        <div className="max-w-none rounded-[var(--r-xl)] bg-surface p-6 shadow-[var(--shadow)] md:p-10">
          <div className="rounded-[var(--r)] bg-tint p-5 mb-8">
            <p className="font-semibold text-ink mb-2">Important Notice</p>
            <p className="text-ink-2 text-sm mb-0">
              These terms govern your use of Urgent.ng. By creating an account or using our
              services, you agree to these terms. Please read them carefully.
            </p>
          </div>

          <section className="mb-8">
            <h2 className="text-lg font-extrabold tracking-[-0.01em] text-ink mb-2">1. About Urgent.ng</h2>
            <p className="text-ink-2 leading-relaxed mb-4">
              Urgent.ng is a peer-to-peer marketplace platform that connects people who need
              errands completed (&quot;Requesters&quot;) with independent service providers
              (&quot;Runners&quot;) who can fulfill those errands.
            </p>
            <p className="text-ink-2 leading-relaxed">
              We are an intermediary platform only. We do not employ Runners, perform errands, or
              control the actions of platform users. All errand agreements are directly between
              Requesters and Runners.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-extrabold tracking-[-0.01em] text-ink mb-2">2. Eligibility</h2>
            <p className="text-ink-2 leading-relaxed mb-4">
              To use Urgent.ng, you must:
            </p>
            <ul className="list-disc pl-6 text-ink-2 space-y-2">
              <li>Be at least 18 years old</li>
              <li>Have the legal capacity to enter into binding contracts</li>
              <li>Reside in Nigeria</li>
              <li>Provide accurate and complete registration information</li>
              <li>Not be prohibited from using our services under Nigerian law</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-extrabold tracking-[-0.01em] text-ink mb-2">
              3. Account Registration and Security
            </h2>
            <p className="text-ink-2 leading-relaxed mb-4">
              You are responsible for:
            </p>
            <ul className="list-disc pl-6 text-ink-2 space-y-2">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized access</li>
              <li>Ensuring your account information remains accurate and up-to-date</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-extrabold tracking-[-0.01em] text-ink mb-2">4. Payment Terms</h2>
            <p className="text-ink-2 leading-relaxed mb-4">
              <strong>Pay-on-Delivery Model:</strong> All errand payments are made directly
              between Requesters and Runners. Urgent.ng does not process, hold, or manage errand
              payments.
            </p>
            <p className="text-ink-2 leading-relaxed mb-4">
              <strong>Platform Fees:</strong> Runner Pro subscriptions, verification fees, and
              boost purchases are processed through our payment provider (Paystack) and are
              non-refundable except as required by law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-extrabold tracking-[-0.01em] text-ink mb-2">5. Prohibited Activities</h2>
            <p className="text-ink-2 leading-relaxed mb-4">
              You may not use Urgent.ng to:
            </p>
            <ul className="list-disc pl-6 text-ink-2 space-y-2">
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
            <h2 className="text-lg font-extrabold tracking-[-0.01em] text-ink mb-2">
              6. Limitation of Liability
            </h2>
            <p className="text-ink-2 leading-relaxed mb-4">
              Urgent.ng is not liable for:
            </p>
            <ul className="list-disc pl-6 text-ink-2 space-y-2">
              <li>Loss, damage, or theft of items during errand execution</li>
              <li>Injuries or damages arising from errand activities</li>
              <li>Disputes between Requesters and Runners</li>
              <li>Quality, safety, or legality of services provided by Runners</li>
              <li>Actions or inactions of platform users</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-extrabold tracking-[-0.01em] text-ink mb-2">7. Dispute Resolution</h2>
            <p className="text-ink-2 leading-relaxed mb-4">
              If a dispute arises between users, we provide a mediation service to help reach a
              fair resolution. However, we cannot force any particular outcome.
            </p>
            <p className="text-ink-2 leading-relaxed">
              For disputes with Urgent.ng itself, Nigerian law governs and courts in Lagos have
              exclusive jurisdiction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-extrabold tracking-[-0.01em] text-ink mb-2">8. Account Termination</h2>
            <p className="text-ink-2 leading-relaxed mb-4">
              We may suspend or terminate your account if you:
            </p>
            <ul className="list-disc pl-6 text-ink-2 space-y-2">
              <li>Violate these terms</li>
              <li>Engage in fraudulent or abusive behavior</li>
              <li>Fail verification requirements</li>
              <li>Accumulate excessive reliability violations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-extrabold tracking-[-0.01em] text-ink mb-2">
              9. Changes to These Terms
            </h2>
            <p className="text-ink-2 leading-relaxed">
              We may update these terms from time to time. We will notify you of material changes
              and require your acceptance before you can continue using the platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-extrabold tracking-[-0.01em] text-ink mb-2">10. Contact Us</h2>
            <p className="text-ink-2 leading-relaxed">
              Questions about these terms? Contact us at{' '}
              <a href="mailto:legal@urgent.ng" className="text-cn-green-800 underline">
                legal@urgent.ng
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
