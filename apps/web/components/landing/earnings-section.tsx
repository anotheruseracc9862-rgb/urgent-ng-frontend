'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@urgent/ui';

export function EarningsSection() {
  const [errandsPerDay, setErrandsPerDay] = useState(4);
  const [avgPrice, setAvgPrice] = useState(3500);
  const [daysPerWeek, setDaysPerWeek] = useState(5);

  // Calculate: errands/day × avg price × days/week × ~4.3 weeks/month
  const monthlyTotal = Math.round(errandsPerDay * avgPrice * daysPerWeek * 4.3);

  return (
    <section id="earn-money" className="py-16 md:py-24 bg-cn-blue-50">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-block px-4 py-2 rounded-full bg-white text-cn-blue-700 text-sm font-medium mb-4">
            Earn on Your Terms
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-cn-blue-900 mb-4">
            Turn Your Free Time into Reliable Daily Income
          </h2>
          <p className="text-lg text-cn-blue-600 max-w-3xl mx-auto">
            Whether you walk, take a bus, ride a bike, or drive, earn by completing quick
            errands in your neighborhood.
          </p>
        </div>

        {/* Calculator Card */}
        <div className="bg-white rounded-3xl shadow-lg p-6 md:p-8">
          <div className="grid lg:grid-cols-[1fr,auto] gap-8">
            {/* Controls */}
            <div className="space-y-6">
              {/* Errands per day */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="errands-slider" className="text-sm font-medium text-cn-blue-700">
                    Errands completed per day
                  </label>
                  <span className="text-sm font-bold text-cn-blue-900">
                    {errandsPerDay} errands / day
                  </span>
                </div>
                <input
                  type="range"
                  id="errands-slider"
                  min={1}
                  max={12}
                  value={errandsPerDay}
                  onChange={(e) => setErrandsPerDay(Number(e.target.value))}
                  className="w-full h-2 bg-cn-blue-100 rounded-lg appearance-none cursor-pointer accent-cn-green-600"
                />
              </div>

              {/* Average price */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="price-slider" className="text-sm font-medium text-cn-blue-700">
                    Average earning per errand
                  </label>
                  <span className="text-sm font-bold text-cn-blue-900">
                    ₦{avgPrice.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  id="price-slider"
                  min={1500}
                  max={8000}
                  step={500}
                  value={avgPrice}
                  onChange={(e) => setAvgPrice(Number(e.target.value))}
                  className="w-full h-2 bg-cn-blue-100 rounded-lg appearance-none cursor-pointer accent-cn-green-600"
                />
              </div>

              {/* Days per week */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="days-slider" className="text-sm font-medium text-cn-blue-700">
                    Working days per week
                  </label>
                  <span className="text-sm font-bold text-cn-blue-900">
                    {daysPerWeek} days / week
                  </span>
                </div>
                <input
                  type="range"
                  id="days-slider"
                  min={1}
                  max={7}
                  value={daysPerWeek}
                  onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                  className="w-full h-2 bg-cn-blue-100 rounded-lg appearance-none cursor-pointer accent-cn-green-600"
                />
              </div>
            </div>

            {/* Results */}
            <div className="lg:min-w-[280px] bg-gradient-to-br from-cn-green-50 to-cn-blue-50 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
              <span className="text-sm font-medium text-cn-blue-600 mb-2">
                Estimated Monthly Earnings
              </span>
              <div className="text-4xl md:text-5xl font-bold text-cn-green-700 mb-4">
                ₦{monthlyTotal.toLocaleString()}
              </div>
              <p className="text-xs text-cn-blue-600 mb-4">
                Paid directly by each requester, in cash or by transfer. Urgent.ng never holds
                your money.
              </p>
              <Button className="w-full" asChild>
                <Link href="/register?mode=runner">Start Earning as a Runner</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
