import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Urgent.ng',
  description: 'How Urgent.ng collects, uses, and protects your personal information',
};

export default function PrivacyPage() {
  return (
    <div className="py-16 bg-white">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-cn-blue-900 mb-4">
            Privacy Policy
          </h1>
          <div className="flex items-center gap-4 text-sm text-cn-blue-600">
            <span>Version 1.0</span>
            <span>•</span>
            <span>Effective: January 1, 2026</span>
          </div>
        </div>

        <div className="prose prose-lg max-w-none">
          <div className="bg-cn-blue-50 border-l-4 border-cn-green-600 p-6 rounded-r-lg mb-8">
            <p className="font-semibold text-cn-blue-900 mb-2">Your Privacy Matters</p>
            <p className="text-cn-blue-700 text-sm mb-0">
              This policy explains how we collect, use, store, and protect your personal
              information when you use Urgent.ng.
            </p>
          </div>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-cn-blue-900 mb-4">
              1. Information We Collect
            </h2>
            
            <h3 className="text-xl font-semibold text-cn-blue-900 mb-3">
              Account Information
            </h3>
            <ul className="list-disc pl-6 text-cn-blue-700 space-y-2 mb-4">
              <li>Name and profile photo</li>
              <li>Phone number or email address</li>
              <li>Password (encrypted)</li>
              <li>Home area (optional)</li>
            </ul>

            <h3 className="text-xl font-semibold text-cn-blue-900 mb-3">
              Verification Information (Runners Only)
            </h3>
            <ul className="list-disc pl-6 text-cn-blue-700 space-y-2 mb-4">
              <li>National Identification Number (NIN) - verified but not stored</li>
              <li>Selfie photo for identity verification</li>
              <li>Guarantor details (optional)</li>
            </ul>

            <h3 className="text-xl font-semibold text-cn-blue-900 mb-3">Errand Information</h3>
            <ul className="list-disc pl-6 text-cn-blue-700 space-y-2 mb-4">
              <li>Pickup and delivery locations</li>
              <li>Contact phone numbers for coordination</li>
              <li>Errand descriptions and instructions</li>
              <li>Photos of items (when provided)</li>
            </ul>

            <h3 className="text-xl font-semibold text-cn-blue-900 mb-3">Location Data</h3>
            <p className="text-cn-blue-700 leading-relaxed mb-4">
              When you use location features, we collect your approximate location to show nearby
              errands or runners. You can control location permissions in your device settings.
            </p>

            <h3 className="text-xl font-semibold text-cn-blue-900 mb-3">Usage Data</h3>
            <ul className="list-disc pl-6 text-cn-blue-700 space-y-2">
              <li>Device information (type, operating system, browser)</li>
              <li>IP address</li>
              <li>Pages visited and features used</li>
              <li>Error logs and performance data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-cn-blue-900 mb-4">
              2. How We Use Your Information
            </h2>
            <ul className="list-disc pl-6 text-cn-blue-700 space-y-2">
              <li>
                <strong>Provide Services:</strong> Match requesters with runners, facilitate
                communication, process payments
              </li>
              <li>
                <strong>Safety and Verification:</strong> Verify runner identities, prevent fraud,
                investigate disputes
              </li>
              <li>
                <strong>Communication:</strong> Send errand updates, notifications, and service
                announcements
              </li>
              <li>
                <strong>Improve Platform:</strong> Analyze usage patterns, fix bugs, develop new
                features
              </li>
              <li>
                <strong>Legal Compliance:</strong> Respond to legal requests, enforce our terms,
                protect our rights
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-cn-blue-900 mb-4">
              3. Information Sharing
            </h2>
            <p className="text-cn-blue-700 leading-relaxed mb-4">
              We share your information only in these situations:
            </p>

            <h3 className="text-xl font-semibold text-cn-blue-900 mb-3">
              Between Users (After Assignment)
            </h3>
            <p className="text-cn-blue-700 leading-relaxed mb-4">
              When a runner is selected for an errand, we share necessary contact information
              (names, phone numbers, addresses) to enable coordination. Before assignment, we show
              only approximate locations and anonymized details.
            </p>

            <h3 className="text-xl font-semibold text-cn-blue-900 mb-3">With Service Providers</h3>
            <ul className="list-disc pl-6 text-cn-blue-700 space-y-2 mb-4">
              <li>Payment processor (Paystack) for transactions</li>
              <li>SMS and email providers for notifications</li>
              <li>Cloud hosting services (AWS)</li>
              <li>Analytics tools for platform improvement</li>
            </ul>

            <h3 className="text-xl font-semibold text-cn-blue-900 mb-3">For Legal Reasons</h3>
            <p className="text-cn-blue-700 leading-relaxed">
              We may disclose information when required by law, to protect our legal rights, or to
              investigate fraud and safety issues.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-cn-blue-900 mb-4">
              4. Data Retention Periods
            </h2>
            <p className="text-cn-blue-700 leading-relaxed mb-4">
              We retain your information for the following periods:
            </p>
            <ul className="list-disc pl-6 text-cn-blue-700 space-y-2">
              <li>
                <strong>Chat messages:</strong> 12 months after errand completion
              </li>
              <li>
                <strong>Location history:</strong> 30 days
              </li>
              <li>
                <strong>Verification photos:</strong> 30 days after verification decision
              </li>
              <li>
                <strong>Notifications:</strong> 90 days
              </li>
              <li>
                <strong>Account data:</strong> Until deletion request, then scrubbed after 30 days
              </li>
              <li>
                <strong>Errand records:</strong> Retained for legal and dispute resolution purposes
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-cn-blue-900 mb-4">5. Your Privacy Rights</h2>
            <p className="text-cn-blue-700 leading-relaxed mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 text-cn-blue-700 space-y-2">
              <li>
                <strong>Access:</strong> Request a copy of your personal data
              </li>
              <li>
                <strong>Correct:</strong> Update inaccurate information in your profile
              </li>
              <li>
                <strong>Delete:</strong> Request account deletion (subject to legal obligations)
              </li>
              <li>
                <strong>Object:</strong> Opt out of marketing communications
              </li>
              <li>
                <strong>Portability:</strong> Receive your data in a structured format
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-cn-blue-900 mb-4">6. Security Measures</h2>
            <p className="text-cn-blue-700 leading-relaxed mb-4">
              We protect your information with:
            </p>
            <ul className="list-disc pl-6 text-cn-blue-700 space-y-2">
              <li>Encryption of data in transit and at rest</li>
              <li>Secure authentication and password hashing</li>
              <li>Regular security audits and monitoring</li>
              <li>Access controls and employee training</li>
              <li>Incident response procedures</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-cn-blue-900 mb-4">
              7. Cookies and Tracking
            </h2>
            <p className="text-cn-blue-700 leading-relaxed mb-4">
              We use cookies and similar technologies to:
            </p>
            <ul className="list-disc pl-6 text-cn-blue-700 space-y-2">
              <li>Keep you logged in</li>
              <li>Remember your preferences</li>
              <li>Analyze platform usage</li>
              <li>Improve performance and security</li>
            </ul>
            <p className="text-cn-blue-700 leading-relaxed mt-4">
              You can control cookies through your browser settings, but some features may not work
              without them.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-cn-blue-900 mb-4">8. Children&apos;s Privacy</h2>
            <p className="text-cn-blue-700 leading-relaxed">
              Urgent.ng is not intended for users under 18. We do not knowingly collect information
              from children. If we discover we have collected data from a child, we will delete it
              immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-cn-blue-900 mb-4">
              9. Changes to This Policy
            </h2>
            <p className="text-cn-blue-700 leading-relaxed">
              We may update this privacy policy from time to time. We will notify you of material
              changes and update the effective date. Continued use of Urgent.ng after changes means
              you accept the updated policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-cn-blue-900 mb-4">10. Contact Us</h2>
            <p className="text-cn-blue-700 leading-relaxed">
              Questions or concerns about your privacy? Contact us at:
            </p>
            <div className="mt-4 p-4 bg-cn-blue-50 rounded-lg">
              <p className="text-cn-blue-700">
                <strong>Email:</strong>{' '}
                <a href="mailto:privacy@urgent.ng" className="text-cn-green-600 hover:underline">
                  privacy@urgent.ng
                </a>
              </p>
              <p className="text-cn-blue-700 mt-2">
                <strong>Address:</strong> Urgent.ng Technologies Limited, Lagos, Nigeria
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
