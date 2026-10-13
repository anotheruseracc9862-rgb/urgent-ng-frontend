'use client';

import { useState } from 'react';
import { Button, Input, Label, Textarea } from '@urgent/ui';

const BUDGET_PRESETS = [2000, 3500, 5000, 8000];

export function InstantRequestSection() {
  const [budget, setBudget] = useState(3500);
  const [selectedPreset, setSelectedPreset] = useState(3500);

  const handlePresetClick = (value: number) => {
    setBudget(value);
    setSelectedPreset(value);
  };

  const handleCustomBudget = (value: string) => {
    setBudget(Number(value));
    setSelectedPreset(0);
  };

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cn-green-50 text-cn-green-700 text-sm font-medium mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cn-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cn-green-500"></span>
            </span>
            On-Demand Express Dispatch
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-cn-blue-900 mb-4">
            Instant Errand Request
          </h2>
          <p className="text-lg text-cn-blue-600 max-w-3xl mx-auto">
            Got a task that needs urgent attention? Submit your request in seconds, name your
            budget, and receive offers from verified runners nearby in under 8 minutes.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl border border-cn-blue-100 shadow-lg p-6 md:p-8 space-y-6">
          {/* Budget Row */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                Your Estimated Budget (₦) <span className="text-red-500">*</span>
              </Label>
              <span className="text-sm font-bold text-cn-green-700">
                ⚡ Pay directly on delivery
              </span>
            </div>
            <div className="grid md:grid-cols-[1fr,auto] gap-4">
              <div className="flex flex-wrap gap-2">
                {BUDGET_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className={`px-4 py-2 rounded-full font-medium transition-colors ${
                      selectedPreset === preset
                        ? 'bg-cn-green-600 text-white'
                        : 'bg-cn-blue-50 text-cn-blue-700 hover:bg-cn-blue-100'
                    }`}
                  >
                    ₦{preset.toLocaleString()}
                  </button>
                ))}
              </div>
              <div className="relative w-full md:w-48">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cn-blue-600 font-medium">
                  ₦
                </span>
                <Input
                  type="number"
                  value={budget}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCustomBudget(e.target.value)}
                  min={500}
                  step={100}
                  placeholder="Custom amount"
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="task-title" className="text-base font-semibold">
              What needs to be done? <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-cn-blue-400"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <Input
                id="task-title"
                placeholder="e.g. Pick up urgent Visa document from VFS Global, deliver to Lekki Phase 1"
                className="pl-11"
              />
            </div>
          </div>

          {/* Pickup and Destination */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pickup" className="text-base font-semibold">
                Pickup Location <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-cn-blue-400"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <Input
                  id="pickup"
                  placeholder="Pickup street / landmark (e.g. Lekki Phase 1)"
                  className="pl-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination" className="text-base font-semibold">
                Delivery Destination <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-cn-blue-400"
                >
                  <polygon points="3 11 22 2 13 21 11 13 3 11" />
                </svg>
                <Input
                  id="destination"
                  placeholder="Delivery street / landmark (e.g. Ikeja GRA)"
                  className="pl-11"
                />
              </div>
            </div>
          </div>

          {/* Category and Timing */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-base font-semibold">
                Errand Category <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-cn-blue-400 pointer-events-none z-10"
                >
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                <select
                  id="category"
                  className="h-12 w-full pl-11 pr-4 py-2 text-sm bg-white border border-cn-blue-200 rounded-[var(--r-sm)] focus:border-lime-600 focus:shadow-[0_0_0_4px_rgba(166,212,69,0.25)] focus:outline-none appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjNjY2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-[length:12px] bg-[right_1rem_center] bg-no-repeat"
                >
                  <option value="Price confirmation">🏷️ Price confirmation</option>
                  <option value="Sell fast">⚡ Sell fast</option>
                  <option value="Delivery">📦 Package Delivery</option>
                  <option value="Shopping">🛒 Market Shopping</option>
                  <option value="Document">📄 Document Pickup</option>
                  <option value="Food">🍲 Food / Groceries</option>
                  <option value="Queue">🏦 Queue &amp; Pay</option>
                  <option value="Physical">🔧 Physical / Inspection</option>
                  <option value="Other">⚡ Other Custom Errand</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgency" className="text-base font-semibold">
                When do you need it?
              </Label>
              <div className="relative">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-cn-blue-400 pointer-events-none z-10"
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <select
                  id="urgency"
                  className="h-12 w-full pl-11 pr-4 py-2 text-sm bg-white border border-cn-blue-200 rounded-[var(--r-sm)] focus:border-lime-600 focus:shadow-[0_0_0_4px_rgba(166,212,69,0.25)] focus:outline-none appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjNjY2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-[length:12px] bg-[right_1rem_center] bg-no-repeat"
                >
                  <option value="immediate">⚡ Express (ASAP — Under 60 mins)</option>
                  <option value="within3h">🕒 Fast (Within 2 to 3 hours)</option>
                  <option value="today">🌅 Flexible (Anytime Today)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description" className="text-base font-semibold">
                Errand Description &amp; Details
              </Label>
              <span className="text-sm text-cn-blue-500">Optional</span>
            </div>
            <div className="relative">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="absolute left-3 top-3 text-cn-blue-400"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <Textarea
                id="description"
                rows={3}
                placeholder="Describe the errand in detail: item specifications, sender/recipient phone numbers, gate instructions, or package fragility..."
                className="pl-11"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t border-cn-blue-100">
            <Button size="lg" className="gap-2" asChild>
              <a href="/register">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polygon points="3 11 22 2 13 21 11 13 3 11" />
                </svg>
                Broadcast Errand to Runners
              </a>
            </Button>
          </div>

          {/* Trust Footer */}
          <div className="grid md:grid-cols-3 gap-4 pt-6 border-t border-cn-blue-100">
            <div className="flex items-start gap-3">
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                className="flex-shrink-0 text-cn-green-600"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span className="text-sm text-cn-blue-700">
                <strong>Pay on Delivery:</strong> Inspect your items and receipts before paying
              </span>
            </div>
            <div className="flex items-start gap-3">
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                className="flex-shrink-0 text-cn-green-600"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span className="text-sm text-cn-blue-700">
                <strong>Community Ratings:</strong> Choose runners based on real peer reviews
              </span>
            </div>
            <div className="flex items-start gap-3">
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                className="flex-shrink-0 text-cn-green-600"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="text-sm text-cn-blue-700">
                <strong>&lt; 8 mins:</strong> Average time to receive competitive price bids
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
