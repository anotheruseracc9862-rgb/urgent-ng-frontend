import { RevealSection } from '@/components/shared/reveal';
import { SectionHeader } from '@/components/shared/section-header';

type Role = 'requester' | 'runner';

const STEPS: Record<Role, { title: string; text: string }[]> = {
  requester: [
    {
      title: 'Post Your Request',
      text: 'Tell us what needs doing, where to pick up and deliver, or the address for a job like cleaning or plumbing, and your preferred timing. Add photos and special instructions.',
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

/**
 * The role switch is two radio inputs: the labels and panels that follow them react to `:checked`
 * through `group-has-*` variants, so the section needs no client JavaScript.
 */
function Steps({ role, className }: { role: Role; className: string }) {
  return (
    <div className={`tab-fade-slide hidden gap-6 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>
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
  );
}

export function HowItWorksSection() {
  return (
    <RevealSection id="how-it-works" className="bg-[#f7f8f7] py-16 md:py-24">
      <div className="group/how mx-auto w-full max-w-6xl px-4">
        <SectionHeader
          tag="Simple & Transparent"
          title="How Urgent.ng Works"
          subtitle="Whether you need something urgently handled or you want to make money running tasks in your spare time, the process is fast and seamless."
        />

        <input type="radio" name="how-role" id="how-requester" defaultChecked className="sr-only" />
        <input type="radio" name="how-role" id="how-runner" className="sr-only" />

        <div className="mb-10 flex justify-center">
          <div
            role="group"
            aria-label="Choose your role"
            className="inline-flex max-w-full flex-col gap-1 rounded-[28px] border border-cn-blue-100 bg-cn-blue-50 p-1 sm:flex-row sm:rounded-full"
          >
            {TABS.map((tab) => (
              <label
                key={tab.role}
                htmlFor={`how-${tab.role}`}
                className={
                  'cursor-pointer rounded-full px-6 py-2 text-center text-sm font-semibold text-cn-blue-500 transition-all duration-200 hover:text-cn-blue-700 ' +
                  (tab.role === 'requester'
                    ? 'group-has-[#how-requester:focus-visible]/how:ring-2 group-has-[#how-requester:focus-visible]/how:ring-lime-600 group-has-[#how-requester:checked]/how:bg-white group-has-[#how-requester:checked]/how:text-cn-blue-700 group-has-[#how-requester:checked]/how:shadow-[0_2px_8px_rgba(16,21,31,0.08)]'
                    : 'group-has-[#how-runner:focus-visible]/how:ring-2 group-has-[#how-runner:focus-visible]/how:ring-lime-600 group-has-[#how-runner:checked]/how:bg-white group-has-[#how-runner:checked]/how:text-cn-blue-700 group-has-[#how-runner:checked]/how:shadow-[0_2px_8px_rgba(16,21,31,0.08)]')
                }
              >
                {tab.label}
              </label>
            ))}
          </div>
        </div>

        <Steps role="requester" className="group-has-[#how-requester:checked]/how:grid" />
        <Steps role="runner" className="group-has-[#how-runner:checked]/how:grid" />
      </div>
    </RevealSection>
  );
}
