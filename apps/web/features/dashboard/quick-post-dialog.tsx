'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';
import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@urgent/ui';
import { saveErrandDraft } from '@/lib/drafts/errand-draft';

/**
 * The demo's "Quick post": the essentials in one small form, then the full post form opens with
 * them filled in (the API needs a category, a time and exact locations, which only the full form
 * can collect).
 */
export function QuickPostDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? '').trim();
    const budget = Number(text('budget').replace(/[^\d]/g, ''));
    const next: Record<string, string> = {};
    if (text('title').length < 5) next.title = 'Say what needs to be done (at least 5 characters).';
    if (!text('pickup')) next.pickup = 'Add the pickup or service area.';
    if (text('budget') && budget < 500) next.budget = 'A budget starts at ₦500.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    saveErrandDraft({
      title: text('title'),
      pickup: text('pickup'),
      destination: text('destination'),
      budgetNaira: budget,
      category: '',
      urgency: '',
    });
    setOpen(false);
    router.push('/errands/new');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost"><Zap aria-hidden="true" className="size-4" />Quick post</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Quick post</DialogTitle>
            <DialogDescription>The essentials. You add photos, contacts and exact locations on the next screen.</DialogDescription>
          </DialogHeader>

          <label className="grid gap-1.5 text-[12.5px] font-bold text-ink-2">
            What do you need done?
            <input
              name="title"
              maxLength={80}
              placeholder="e.g. Pick up groceries from Justrite"
              aria-invalid={Boolean(errors.title)}
              className="min-h-12 rounded-[var(--r-sm)] border border-line bg-surface px-4 text-sm font-normal outline-none focus-visible:border-lime-600 focus-visible:ring-4 focus-visible:ring-lime/25"
            />
            {errors.title ? <span role="alert" className="text-xs font-semibold text-red">{errors.title}</span> : null}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-[12.5px] font-bold text-ink-2">
              Pickup or service area
              <input
                name="pickup"
                placeholder="e.g. Lekki Phase 1"
                aria-invalid={Boolean(errors.pickup)}
                className="min-h-12 rounded-[var(--r-sm)] border border-line bg-surface px-4 text-sm font-normal outline-none focus-visible:border-lime-600 focus-visible:ring-4 focus-visible:ring-lime/25"
              />
              {errors.pickup ? <span role="alert" className="text-xs font-semibold text-red">{errors.pickup}</span> : null}
            </label>
            <label className="grid gap-1.5 text-[12.5px] font-bold text-ink-2">
              <span>Drop-off area <em className="ml-1 text-[11px] font-semibold not-italic text-faint">Optional · deliveries only</em></span>
              <input
                name="destination"
                placeholder="e.g. Ikoyi"
                className="min-h-12 rounded-[var(--r-sm)] border border-line bg-surface px-4 text-sm font-normal outline-none focus-visible:border-lime-600 focus-visible:ring-4 focus-visible:ring-lime/25"
              />
            </label>
          </div>

          <label className="grid gap-1.5 text-[12.5px] font-bold text-ink-2">
            <span>Suggested budget <em className="ml-1 text-[11px] font-semibold not-italic text-faint">Optional</em></span>
            <span className="flex items-center overflow-hidden rounded-[var(--r-sm)] border border-line bg-surface focus-within:border-lime-600 focus-within:ring-4 focus-within:ring-lime/25">
              <span className="pl-4 font-bold text-muted">₦</span>
              <input
                name="budget"
                inputMode="numeric"
                placeholder="5,000"
                aria-invalid={Boolean(errors.budget)}
                className="min-h-12 w-full bg-transparent px-3 text-sm font-normal outline-none"
              />
            </span>
            <span className="text-xs font-normal text-muted">Guidance only. Runners can offer a different price.</span>
            {errors.budget ? <span role="alert" className="text-xs font-semibold text-red">{errors.budget}</span> : null}
          </label>

          <Alert variant="lime">
            <p>Payment is made directly to the runner. Urgent.ng does not handle it.</p>
          </Alert>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Continue</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
