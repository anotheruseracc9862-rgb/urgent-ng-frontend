'use client';

import { useState } from 'react';

export function HowItWorksSection() {
  const [activeRole, setActiveRole] = useState<'requester' | 'runner'>('requester');

  return (
    <section id="how-it-works" className="py-16 md:py-24 bg-cn-blue-50">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-block px-4 py-2 rounded-full bg-white text-cn-blue-700 text-sm font-medium mb-4">
            Simple &amp; Transparent
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-cn-blue-900 mb-4">
            How Urgent.ng Works
          </h2>
          <p className="text-lg text-cn-blue-600 max-w-3xl mx-auto">
            Whether you need something urgently handled or you want to make money running tasks
            in your spare time, the process is fast and seamless.
          </p>
        </div>

        {/* Role Selector */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-white rounded-full p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveRole('requester')}
              className={`px-6 py-3 rounded-full font-medium transition-all ${
                activeRole === 'requester'
                  ? 'bg-cn-green-600 text-white shadow-md'
                  : 'text-cn-blue-700 hover:text-cn-blue-900'
              }`}
            >
              I Need an Errand Done (Requester)
            </button>
            <button
              type="button"
              onClick={() => setActiveRole('runner')}
              className={`px-6 py-3 rounded-full font-medium transition-all ${
                activeRole === 'runner'
                  ? 'bg-cn-green-600 text-white shadow-md'
                  : 'text-cn-blue-700 hover:text-cn-blue-900'
              }`}
            >
              I Want to Earn (Runner)
            </button>
          </div>
        </div>

        {/* Requester Steps */}
        {activeRole === 'requester' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-cn-green-100 text-cn-green-700 font-bold text-xl flex items-center justify-center mb-4">
                1
              </div>
              <h3 className="text-xl font-bold text-cn-blue-900 mb-3">
                1. Post Your Request
              </h3>
              <p className="text-cn-blue-600">
                Tell us what needs doing, where to pick up, where to deliver, and your preferred
                timing. Add photos and special instructions.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-cn-green-100 text-cn-green-700 font-bold text-xl flex items-center justify-center mb-4">
                2
              </div>
              <h3 className="text-xl font-bold text-cn-blue-900 mb-3">
                2. Receive Price Offers
              </h3>
              <p className="text-cn-blue-600">
                Nearby available runners receive your alert and bid the exact price they will
                charge to get it done.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-cn-green-100 text-cn-green-700 font-bold text-xl flex items-center justify-center mb-4">
                3
              </div>
              <h3 className="text-xl font-bold text-cn-blue-900 mb-3">
                3. Choose Your Runner
              </h3>
              <p className="text-cn-blue-600">
                Compare runner ratings, reviews, past completed tasks, and prices. Select the
                best match with one click.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-cn-green-100 text-cn-green-700 font-bold text-xl flex items-center justify-center mb-4">
                4
              </div>
              <h3 className="text-xl font-bold text-cn-blue-900 mb-3">
                4. Delivered &amp; Paid
              </h3>
              <p className="text-cn-blue-600">
                Your runner completes the errand. Once you inspect and confirm receipt, pay the
                runner directly via transfer or cash upon delivery.
              </p>
            </div>
          </div>
        )}

        {/* Runner Steps */}
        {activeRole === 'runner' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-cn-green-100 text-cn-green-700 font-bold text-xl flex items-center justify-center mb-4">
                1
              </div>
              <h3 className="text-xl font-bold text-cn-blue-900 mb-3">
                1. Discover Nearby Tasks
              </h3>
              <p className="text-cn-blue-600">
                See a real-time list of errand requests in your neighborhood (Lekki, Yaba, Ikeja,
                Garki, etc.) with clear distance estimates.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-cn-green-100 text-cn-green-700 font-bold text-xl flex items-center justify-center mb-4">
                2
              </div>
              <h3 className="text-xl font-bold text-cn-blue-900 mb-3">
                2. Submit Your Price
              </h3>
              <p className="text-cn-blue-600">
                Set how much you want to charge and your expected delivery time. You are your own
                boss with zero forced pricing.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-cn-green-100 text-cn-green-700 font-bold text-xl flex items-center justify-center mb-4">
                3
              </div>
              <h3 className="text-xl font-bold text-cn-blue-900 mb-3">3. Run the Errand</h3>
              <p className="text-cn-blue-600">
                When the requester accepts your offer, pick up the item, communicate clearly,
                deliver promptly, and collect payment upon delivery.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-cn-green-100 text-cn-green-700 font-bold text-xl flex items-center justify-center mb-4">
                4
              </div>
              <h3 className="text-xl font-bold text-cn-blue-900 mb-3">4. Direct Payment</h3>
              <p className="text-cn-blue-600">
                Get paid directly by the requester upon completion via bank transfer or cash in
                hand with zero platform deductions.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
