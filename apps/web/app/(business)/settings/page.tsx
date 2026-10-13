import Link from 'next/link';
import { Bell, ChevronRight, Phone } from 'lucide-react';

export const metadata = { title: 'Settings — Urgent.ng' };

const SECTIONS = [
  {
    href: '/settings/contact',
    icon: Phone,
    title: 'Contact methods',
    text: 'Add or change the phone number and email you sign in with.',
  },
  {
    href: '/settings/notifications',
    icon: Bell,
    title: 'Notifications',
    text: 'Choose what reaches you, and set quiet hours.',
  },
] as const;

export default function SettingsPage() {
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-wider text-green-700">Account</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">Settings</h1>
      </div>
      <ul className="grid gap-3">
        {SECTIONS.map(({ href, icon: Icon, title, text }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-center gap-4 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)] transition-transform hover:-translate-y-0.5"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-tint text-green-800">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block text-sm text-ink">{title}</strong>
                <span className="mt-0.5 block text-xs text-muted">{text}</span>
              </span>
              <ChevronRight className="size-4 text-muted" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
