import { RevealSection } from '@/components/shared/reveal';
import { SectionHeader } from '@/components/shared/section-header';

export function TrustSecuritySection() {
  return (
    <RevealSection id="trust-safety" className="py-16 md:py-24 bg-[#f7f8f7]">
      <div className="mx-auto w-full px-4 max-w-6xl">
        <SectionHeader
          tag="Community Safety"
          title="Tips for Safe & Seamless Errands"
          subtitle="Urgent.ng connects you directly with independent local runners. Here is how to keep every errand smooth, reliable, and secure."
        />

        {/* Security Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="card-lift bg-white p-[22px]">
            <div className="icon-pop grid size-11 place-items-center rounded-[14px] bg-[#eaf5cf] text-[#3b5000] mb-3.5">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                
              >
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <h3 className="text-[17px] font-extrabold tracking-[-0.01em] text-ink mb-2.5">Pay Only on Delivery</h3>
            <p className="text-[13.5px] leading-normal text-muted">
              Never pay for errand labor upfront. Inspect your delivered package or shopping
              purchase with official receipts before transferring funds or handing over cash.
            </p>
          </div>

          <div className="card-lift bg-white p-[22px]">
            <div className="icon-pop grid size-11 place-items-center rounded-[14px] bg-[#eaf5cf] text-[#3b5000] mb-3.5">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <h3 className="text-[17px] font-extrabold tracking-[-0.01em] text-ink mb-2.5">Check Ratings &amp; Reviews</h3>
            <p className="text-[13.5px] leading-normal text-muted">
              Before accepting a bid, review the runner&apos;s completed task count, star ratings, and
              honest feedback left by other community members in your area.
            </p>
          </div>

          <div className="card-lift bg-white p-[22px]">
            <div className="icon-pop grid size-11 place-items-center rounded-[14px] bg-[#eaf5cf] text-[#3b5000] mb-3.5">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <h3 className="text-[17px] font-extrabold tracking-[-0.01em] text-ink mb-2.5">Use Public Landmarks</h3>
            <p className="text-[13.5px] leading-normal text-muted">
              For handovers, choose well-lit public spots like shopping malls, fuel stations, or
              office gates. Keep all errand terms and expectations documented in in-app chat.
            </p>
          </div>
        </div>
      </div>
    </RevealSection>
  );
}
