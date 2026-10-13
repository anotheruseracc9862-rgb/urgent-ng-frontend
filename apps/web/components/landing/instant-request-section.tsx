'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Boxes, Clock, FileText, MapPin, Navigation, Send, ShieldCheck, Star, Zap } from 'lucide-react';
import { cn } from '@urgent/ui';
import { RevealSection } from '@/components/shared/reveal';
import type { PopularCategory } from '@/lib/api/reference';
import { saveErrandDraft } from '@/lib/drafts/errand-draft';

const BUDGET_PRESETS = [2000, 3500, 5000, 8000];

/** Shared look for text inputs, selects and the textarea in this card (demo `.instant-input`). */
const FIELD =
  'h-12 w-full rounded-xl border border-line bg-white pl-11 pr-4 text-sm text-ink placeholder:text-faint transition-shadow focus:border-lime-600 focus:shadow-[0_0_0_4px_rgba(166,212,69,0.25)] focus:outline-none';

const CHEVRON =
  "appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjNjY2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-[length:12px] bg-[right_1rem_center] bg-no-repeat";

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="text-[12.5px] font-bold text-ink-2">
      {children}
      {required ? <span className="text-red"> *</span> : null}
    </label>
  );
}

function IconField({ icon: Icon, children, top }: { icon: typeof Clock; children: React.ReactNode; top?: boolean }) {
  return (
    <div className="group relative">
      <Icon
        className={cn(
          'pointer-events-none absolute left-3.5 z-10 size-[18px] text-faint transition-colors group-focus-within:text-green',
          top ? 'top-4' : 'top-1/2 -translate-y-1/2',
        )}
      />
      {children}
    </div>
  );
}

/** Shown only when the reference API cannot be reached. */
const FALLBACK_CATEGORIES: Pick<PopularCategory, 'key' | 'name'>[] = [
  { key: 'delivery', name: 'Package Delivery' },
  { key: 'shopping', name: 'Market Shopping' },
  { key: 'document', name: 'Document Pickup' },
  { key: 'other', name: 'Other Custom Errand' },
];

export function InstantRequestSection({ categories = [] }: { categories?: PopularCategory[] }) {
  const options = categories.length > 0 ? categories : FALLBACK_CATEGORIES;
  const router = useRouter();
  const [budget, setBudget] = useState('3500');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const preset = BUDGET_PRESETS.find((p) => String(p) === budget);

  return (
    <RevealSection id="instant-request" className="bg-gradient-to-b from-cn-blue-50 to-white py-16 md:py-24">
      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-cn-green-50 px-4 py-2 text-sm font-medium text-cn-green-700">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-cn-green-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-cn-green-500" />
            </span>
            On-Demand Express Dispatch
          </div>
          <h2 className="mb-4 text-3xl font-extrabold text-cn-blue-900 md:text-4xl">Instant Errand Request</h2>
          <p className="mx-auto max-w-3xl text-lg text-cn-blue-600">
            Got a task that needs urgent attention? Submit your request in seconds, name your budget, and receive
            offers from verified runners nearby in under 8 minutes.
          </p>
        </div>

        <div className="card-calm rounded-[22px] bg-white p-5 shadow-[var(--tu-shadow)] sm:rounded-[28px] sm:p-8">
          <form
            className="grid gap-5"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const text = (key: string) => String(data.get(key) ?? '').trim();
              const amount = Number(budget);
              const next: Record<string, string> = {};
              if (!Number.isFinite(amount) || amount < 500) next.budget = 'Enter at least ₦500';
              if (text('title').length < 5) next.title = 'Say what needs to be done';
              if (!text('pickup')) next.pickup = 'Add a pickup location';
              if (!text('destination')) next.destination = 'Add a delivery destination';
              setErrors(next);
              if (Object.keys(next).length > 0) return;
              saveErrandDraft({
                budgetNaira: amount,
                title: text('title'),
                pickup: text('pickup'),
                destination: text('destination'),
                category: text('category'),
                urgency: text('urgency'),
                description: text('description') || undefined,
              });
              router.push('/register');
            }}
          >
            {/* Budget: tinted block, ink-selected pills */}
            <div className="grid gap-3 rounded-[22px] bg-gradient-to-br from-[#f1fadb] to-white to-70% p-[18px]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="budget" className="text-[12.5px] font-bold text-ink-2">
                  Your Estimated Budget (₦) <span className="text-red">*</span>
                </label>
                <span className="inline-flex items-center gap-1 rounded-full bg-tint-2 px-2.5 py-1 text-[11.5px] font-bold text-green-900">
                  <Zap className="size-3 fill-[#ff7a45] text-[#ff7a45]" /> Pay directly on delivery
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_minmax(0,260px)] md:items-center">
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {BUDGET_PRESETS.map((value) => {
                    const active = preset === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setBudget(String(value))}
                        className={cn(
                          'h-12 rounded-full text-sm font-bold transition-all hover:-translate-y-0.5',
                          active
                            ? 'bg-ink text-white shadow-[0_4px_14px_rgba(23,33,46,0.25)]'
                            : 'bg-white text-ink-2 shadow-[inset_0_0_0_1px_rgba(23,33,46,0.08)] hover:bg-panel',
                        )}
                      >
                        ₦{value.toLocaleString()}
                      </button>
                    );
                  })}
                </div>
                <div className="flex h-12 items-center gap-2 rounded-full border border-ink/10 bg-white px-4 focus-within:border-cn-green-500 focus-within:shadow-[0_0_0_4px_rgba(166,212,69,0.25)]">
                  <span className="font-bold text-muted">₦</span>
                  <input
                    id="budget"
                    type="number"
                    inputMode="numeric"
                    min={500}
                    step={100}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="Custom amount"
                    className="h-full min-w-0 flex-1 bg-transparent text-sm font-bold outline-none"
                  />
                </div>
                {errors.budget ? <p className="text-xs font-semibold text-red">{errors.budget}</p> : null}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="task-title" required>
                What needs to be done?
              </Label>
              <IconField icon={Clock}>
                <input
                  id="task-title"
                  name="title"
                  type="text"
                  className={FIELD}
                  placeholder="e.g. Pick up urgent Visa document from VFS Global, deliver to Lekki Phase 1"
                />
              </IconField>
              {errors.title ? <p className="text-xs font-semibold text-red">{errors.title}</p> : null}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="pickup" required>
                  Pickup Location
                </Label>
                <IconField icon={MapPin}>
                  <input
                    id="pickup"
                  name="pickup"
                    type="text"
                    className={FIELD}
                    placeholder="Pickup street / landmark (e.g. Lekki Phase 1)"
                  />
                </IconField>
                {errors.pickup ? <p className="text-xs font-semibold text-red">{errors.pickup}</p> : null}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="destination" required>
                  Delivery Destination
                </Label>
                <IconField icon={Navigation}>
                  <input
                    id="destination"
                  name="destination"
                    type="text"
                    className={FIELD}
                    placeholder="Delivery street / landmark (e.g. Ikeja GRA)"
                  />
                </IconField>
                {errors.destination ? <p className="text-xs font-semibold text-red">{errors.destination}</p> : null}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="category" required>
                  Errand Category
                </Label>
                <IconField icon={Boxes}>
                  <select id="category"
                  name="category" className={cn(FIELD, CHEVRON)} defaultValue={options[0]?.key}>
                    {options.map((category) => (
                      <option key={category.key} value={category.key}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </IconField>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="urgency">When do you need it?</Label>
                <IconField icon={Zap}>
                  <select id="urgency"
                  name="urgency" className={cn(FIELD, CHEVRON)} defaultValue="immediate">
                    <option value="immediate">⚡ Express (ASAP — Under 60 mins)</option>
                    <option value="within3h">🕒 Fast (Within 2 to 3 hours)</option>
                    <option value="today">🌅 Flexible (Anytime Today)</option>
                  </select>
                </IconField>
              </div>
            </div>

            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Errand Description &amp; Details</Label>
                <span className="text-[11.5px] font-semibold text-faint">Optional</span>
              </div>
              <IconField icon={FileText} top>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  className={cn(FIELD, 'h-auto min-h-[110px] resize-y py-3.5')}
                  placeholder="Describe the errand in detail: item specifications, sender/recipient phone numbers, gate instructions, or package fragility..."
                />
              </IconField>
            </div>

            <div className="flex justify-end border-t border-line-2 pt-5">
              <button
                type="submit"
                className="relative inline-flex h-[52px] items-center justify-center gap-2.5 overflow-hidden rounded-full bg-cn-green-500 px-7 text-[15px] font-extrabold text-ink shadow-[0_4px_14px_rgba(147,199,0,0.35)] transition-all hover:-translate-y-0.5 hover:bg-cn-green-400 hover:shadow-[0_10px_24px_-4px_rgba(147,199,0,0.5)] max-sm:w-full"
              >
                <Send className="size-5" strokeWidth={2.5} />
                Broadcast Errand to Runners
              </button>
            </div>

            <div className="grid gap-3.5 md:grid-cols-3">
              {[
                { icon: ShieldCheck, strong: 'Pay on Delivery:', text: 'Inspect your items and receipts before paying' },
                { icon: Star, strong: 'Community Ratings:', text: 'Choose runners based on real peer reviews' },
                { icon: Clock, strong: '< 8 mins:', text: 'Average time to receive competitive price bids' },
              ].map(({ icon: Icon, strong, text }) => (
                <div key={strong} className="flex items-start gap-3 rounded-2xl bg-panel p-3.5 text-[12.5px] leading-normal text-muted">
                  <span className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-tint-2 text-green-900">
                    <Icon className="size-5" strokeWidth={2} />
                  </span>
                  <span>
                    <strong className="text-ink">{strong}</strong> {text}
                  </span>
                </div>
              ))}
            </div>
          </form>
        </div>
      </div>
    </RevealSection>
  );
}
