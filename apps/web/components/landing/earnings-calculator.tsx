'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@urgent/ui';

/** The only interactive part of the earnings section: three sliders and the estimate. */
export function EarningsCalculator() {
  const [errandsPerDay, setErrandsPerDay] = useState(4);
  const [avgPrice, setAvgPrice] = useState(3500);
  const [daysPerWeek, setDaysPerWeek] = useState(5);

  // errands/day × average price × days/week × ~4.3 weeks/month
  const monthlyTotal = Math.round(errandsPerDay * avgPrice * daysPerWeek * 4.3);

  return (
    <>
  {/* Calculator Card */}
  <div className="card-calm mx-auto max-w-[900px] rounded-[28px] border border-cn-blue-100 bg-white p-6 shadow-lg md:p-12">
    <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-12">
      {/* Controls */}
      <div className="space-y-6">
        {/* Errands per day */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="errands-slider" className="text-sm font-semibold text-cn-blue-600">
              Errands completed per day
            </label>
            <span className="text-xl font-bold text-cn-green-600">
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
            className="range cursor-pointer"
          />
        </div>

        {/* Average price */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="price-slider" className="text-sm font-semibold text-cn-blue-600">
              Average earning per errand
            </label>
            <span className="text-xl font-bold text-cn-green-600">
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
            className="range cursor-pointer"
          />
        </div>

        {/* Days per week */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="days-slider" className="text-sm font-semibold text-cn-blue-600">
              Working days per week
            </label>
            <span className="text-xl font-bold text-cn-green-600">
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
            className="range cursor-pointer"
          />
        </div>
      </div>

      {/* Results */}
      <div className="flex flex-col items-center gap-4 rounded-[28px] bg-cn-blue-700 p-8 text-center text-white shadow-md">
        <span className="text-xs font-bold uppercase tracking-[0.05em] text-cn-green-400">
          Estimated Monthly Earnings
        </span>
        <div className="text-[34px] font-bold tracking-[-0.02em] text-white sm:text-[38px]">
          ₦{monthlyTotal.toLocaleString()}
        </div>
        <p className="text-xs text-cn-blue-300">
          Paid directly by each requester, in cash or by transfer. Urgent.ng never holds your money.
        </p>
        <Button className="w-full" asChild>
          <Link href="/register?mode=runner">Start Earning as a Runner</Link>
        </Button>
      </div>
    </div>
  </div>
    </>
  );
}
