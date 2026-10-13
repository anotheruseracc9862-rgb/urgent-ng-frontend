export function TrustSecuritySection() {
  return (
    <section id="trust-safety" className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-block px-4 py-2 rounded-full bg-cn-blue-50 text-cn-blue-700 text-sm font-medium mb-4">
            Community Safety
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-cn-blue-900 mb-4">
            Tips for Safe &amp; Seamless Errands
          </h2>
          <p className="text-lg text-cn-blue-600 max-w-3xl mx-auto">
            Urgent.ng connects you directly with independent local runners. Here is how to keep
            every errand smooth, reliable, and secure.
          </p>
        </div>

        {/* Security Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-cn-blue-100 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-14 h-14 rounded-full bg-cn-green-100 flex items-center justify-center mb-4">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-cn-green-700"
              >
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-cn-blue-900 mb-3">Pay Only on Delivery</h3>
            <p className="text-cn-blue-600">
              Never pay for errand labor upfront. Inspect your delivered package or shopping
              purchase with official receipts before transferring funds or handing over cash.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-cn-blue-100 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-14 h-14 rounded-full bg-cn-green-100 flex items-center justify-center mb-4">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-cn-green-700"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-cn-blue-900 mb-3">Check Ratings &amp; Reviews</h3>
            <p className="text-cn-blue-600">
              Before accepting a bid, review the runner&apos;s completed task count, star ratings, and
              honest feedback left by other community members in your area.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-cn-blue-100 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-14 h-14 rounded-full bg-cn-green-100 flex items-center justify-center mb-4">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-cn-green-700"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-cn-blue-900 mb-3">Use Public Landmarks</h3>
            <p className="text-cn-blue-600">
              For handovers, choose well-lit public spots like shopping malls, fuel stations, or
              office gates. Keep all errand terms and expectations documented in in-app chat.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
