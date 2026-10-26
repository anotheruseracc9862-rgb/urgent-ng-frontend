import type { ReactNode } from 'react';
import { formatPolicyDate, getPolicy } from '@/lib/api/policies';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Urgent.ng',
  description: 'Terms and conditions for using Urgent.ng errand and services marketplace',
};

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mb-8 scroll-mt-24">
      <h2 className="text-lg font-extrabold tracking-[-0.01em] text-ink mb-2">{title}</h2>
      {children}
    </section>
  );
}

const P = ({ children, last = false }: { children: ReactNode; last?: boolean }) => (
  <p className={`text-ink-2 leading-relaxed ${last ? '' : 'mb-4'}`}>{children}</p>
);

const Bullets = ({ items }: { items: ReactNode[] }) => (
  <ul className="list-disc pl-6 text-ink-2 space-y-2 mb-4">
    {items.map((item, index) => <li key={index}>{item}</li>)}
  </ul>
);

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
              These terms govern your use of Urgent.ng. By creating an account or using our services, you agree to these
              terms, including the sections on payment, safety and prohibited items below. <strong>Urgent.ng does not hold,
              collect or guarantee payment between users.</strong> Please read them carefully.
            </p>
          </div>

          <Section title="1. About Urgent.ng">
            <P>
              Urgent.ng is a peer-to-peer marketplace platform that connects people who need errands or household services done
              (&quot;Requesters&quot;) with independent individuals (&quot;Runners&quot;) who do them. Examples are delivery,
              pickup and shopping errands, and services done at one address such as cleaning, plumbing and electrical work.
            </P>
            <P>
              We are an intermediary platform only. We do not employ Runners, perform errands or services, or control the
              actions of platform users. Each errand or service is an agreement directly between a Requester and a Runner.
            </P>
            <P last>
              We check a Runner&apos;s identity (see Safety below). We do not check, license or guarantee any Runner&apos;s trade
              qualification, skill, experience, permit or insurance, and we do not guarantee that any Runner will accept,
              complete or do a job well.
            </P>
          </Section>

          <Section title="2. Eligibility">
            <P>To use Urgent.ng, you must:</P>
            <Bullets items={[
              'Be at least 18 years old',
              'Have the legal capacity to enter into binding contracts',
              'Reside in Nigeria',
              'Provide accurate and complete registration information',
              'Not be prohibited from using our services under Nigerian law',
            ]} />
          </Section>

          <Section title="3. Account Registration and Security">
            <P>You are responsible for:</P>
            <Bullets items={[
              'Maintaining the confidentiality of your account credentials',
              'All activities that occur under your account',
              'Notifying us immediately of any unauthorized access',
              'Ensuring your account information remains accurate and up-to-date',
            ]} />
          </Section>

          <Section title="4. Offers, Agreements and Completion">
            <Bullets items={[
              'A Requester posts an errand or service. Runners may each make one offer on it. The Requester may select an offer, counter it or decline it.',
              'A selected Runner then has a short time to accept. Once the Runner accepts, the agreed amount and details are an agreement between the Requester and the Runner. Urgent.ng is not a party to it.',
              'After acceptance, a change to the amount, place or time needs the other person to agree through the app, and can only be asked for before the work or pickup starts.',
              'When the Runner records the errand as delivered or the work as finished, the Requester should confirm it. If the Requester does not confirm or open a dispute within 24 hours, it completes automatically.',
              'Cancelling after a Runner has accepted may be recorded against your reliability record, and may affect your ratings and what you can do on the platform.',
              'Ratings must be honest and based on your own experience. They are shown once both people have rated, or after the rating period ends.',
            ]} />
          </Section>

          <Section id="payment-terms" title="5. Payment Terms">
            <P>
              <strong>You pay each other directly.</strong> Payment for an errand or service is made directly between the
              Requester and the Runner, for example in cash or by bank transfer, as they agree. Urgent.ng does not process,
              hold, collect, transfer or guarantee that payment.
            </P>
            <P>
              <strong>We are not responsible for non-payment.</strong> Urgent.ng is not responsible if a payment is not made,
              is late, is the wrong amount or is disputed, and we cannot collect or recover it for you. Agree the amount and
              method before work starts. Be careful about paying before the work is done, and about handing over goods or
              doing work before you are comfortable that you will be paid.
            </P>
            <P>
              <strong>The payment plan is only a note.</strong> The app lets the two of you note how and when payment will be
              made. It is a record for your own clarity. It is not a contract with Urgent.ng, Urgent.ng does not enforce it,
              and confirming it does not make Urgent.ng responsible for it.
            </P>
            <P>
              <strong>Platform fees.</strong> Runner Pro, verification fees and boosts are paid to us through our payment
              provider (Paystack). Prices shown include VAT where VAT applies. They are non-refundable except as set out here
              or as required by law.
            </P>
            <Bullets items={[
              <span key="pro"><strong>Runner Pro</strong> lasts for the period you pay for. It renews only if you choose automatic renewal, and you can cancel at any time. If you cancel, you keep the benefits until the end of the period you have paid for.</span>,
              <span key="boost"><strong>Boosts</strong> show an open errand higher in the runner feed, and tell nearby runners about it, until the end time shown. A boost ends early if you cancel the errand, it expires, or a runner accepts it. A boost is not refunded once it has started, and it does not guarantee offers or an outcome. If your errand was no longer open when your payment went through, or the same errand was boosted twice, the extra or unused payment is refunded automatically.</span>,
              <span key="verification"><strong>Verification fees</strong> are refunded if our verification provider fails to process your check.</span>,
            ]} />
          </Section>

          <Section id="prohibited-items" title="6. Prohibited Activities and Items">
            <P>You may not use Urgent.ng to:</P>
            <Bullets items={[
              'Transport illegal goods or contraband',
              'Engage in fraudulent or deceptive practices',
              'Harass, threaten, or abuse other users',
              'Violate any applicable laws or regulations',
              'Circumvent platform fees or verification requirements',
              'Create multiple accounts to manipulate the system',
              'Post errands or services for prohibited items or purposes (weapons, drugs, counterfeit goods, etc.)',
              'Offer or ask for work that is illegal, or that the law requires a licence or permit for that the Runner does not hold',
            ]} />
          </Section>

          <Section id="safety" title="7. Safety">
            <Bullets items={[
              'Runners are identity-checked before they can make offers. This is an identity check, not a background, criminal-record or character check, and it does not guarantee how anyone will behave.',
              'Keep messages and arrangements inside Urgent.ng, never share one-time codes or passwords, and take care before letting anyone into your home or handing over valuables.',
              'Sharing your live location during an errand is optional and needs your consent. The other person sees a rounded position, not an exact one. You may also share a progress link with a trusted contact, and you are responsible for who you share it with.',
              'If you are in danger, contact the emergency services first. Then report the problem in the app so our team can review it.',
            ]} />
          </Section>

          <Section title="8. Limitation of Liability">
            <P>
              To the maximum extent permitted by law, Urgent.ng is not liable for:
            </P>
            <Bullets items={[
              'Loss, damage, or theft of items or property, including at a home, during an errand or service',
              'Injuries or damages arising from errand or service activities',
              'Non-payment, late payment or any disagreement about payment between users',
              'Disputes between Requesters and Runners',
              'The quality, safety, legality, qualification or insurance of services provided by Runners',
              'Actions or inactions of platform users',
              'The results of a boost, or any loss caused by the platform being unavailable',
            ]} />
            <P>
              Subject to that, and to the extent the law allows, our total liability to you for any claim connected with the
              platform is limited to the fees you paid to Urgent.ng in the 12 months before the claim arose.
            </P>
            <P last>
              Nothing in these terms excludes or limits any liability that cannot be excluded or limited under Nigerian law,
              including liability for fraud, or for death or personal injury caused by our negligence.
            </P>
          </Section>

          <Section title="9. Dispute Resolution">
            <P>
              If a dispute arises between users, you can open a dispute in the app. Our team reviews what each person provides
              and may record an outcome: mark the errand completed, cancel it, or dismiss the dispute. The outcome can affect
              ratings, reliability records and account standing.
            </P>
            <P>
              Because we do not hold or move money, we cannot order a payment or compensation. Our decision is not a court
              judgment, and you remain free to pursue your own legal remedies.
            </P>
            <P>
              Before you start any legal action against Urgent.ng, please contact us at legal@urgent.ng and give us 30 days
              to try to resolve it with you.
            </P>
            <P last>
              For disputes with Urgent.ng itself, Nigerian law governs and courts in Lagos have exclusive jurisdiction.
            </P>
          </Section>

          <Section title="10. Account Termination and Closing Your Account">
            <P>We may suspend or terminate your account if you:</P>
            <Bullets items={[
              'Violate these terms',
              'Engage in fraudulent or abusive behavior',
              'Fail verification requirements',
              'Accumulate excessive reliability violations',
            ]} />
            <P last>
              You can ask to close your account at any time. You have 14 days to change your mind. You must finish or cancel
              any active errands first. We keep some records for legal and dispute purposes, as the Privacy Policy explains.
            </P>
          </Section>

          <Section title="11. Changes to These Terms">
            <P last>
              We may update these terms from time to time. We will notify you of material changes
              and require your acceptance before you can continue using the platform.
            </P>
          </Section>

          <Section title="12. Your Responsibility">
            <P last>
              You are responsible for what you post and for what you do through the platform. If you break these terms or the
              law, for example by posting a prohibited item or doing work you are not permitted to do, and that causes us a
              loss or a claim from someone else, you agree to cover that loss to the extent the law allows.
            </P>
          </Section>

          <Section title="13. General">
            <Bullets items={[
              'Content: you keep ownership of the photos, messages and reviews you post. You give us a limited licence to store, show and use them to run the platform, including for dispute and safety reviews.',
              'If any part of these terms is found unenforceable, the rest still applies.',
              'These terms, with the Privacy Policy, are the whole agreement between you and Urgent.ng about the platform.',
              'We are not responsible for a delay or failure caused by something outside our control, such as a power or network outage, a provider failure, or a government action.',
              'We will send you notices by email, text message or in the app, using the contact details on your account.',
              'You may not transfer your account to someone else.',
            ]} />
          </Section>

          <Section title="14. Contact Us">
            <P last>
              Questions about these terms? Contact us at{' '}
              <a href="mailto:legal@urgent.ng" className="text-cn-green-800 underline">
                legal@urgent.ng
              </a>
            </P>
          </Section>
        </div>
      </div>
    </div>
  );
}
