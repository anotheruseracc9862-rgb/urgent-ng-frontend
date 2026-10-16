import Link from 'next/link';
import { Bell, ChevronRight, Receipt, MapPin, Phone, Repeat2, Shield, UserRoundX, UserRoundCog } from 'lucide-react';

export const metadata = { title: 'Settings — Urgent.ng' };

const GROUPS = [
  {
    id: 'preferences',
    title: 'Preferences',
    text: 'Your contact details and the updates you receive.',
    items: [
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
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy & security',
    text: 'Control permissions, sessions and who can reach you.',
    items: [
      {
        href: '/settings/privacy',
        icon: MapPin,
        title: 'Privacy & consents',
        text: 'Review required policies and manage optional permissions.',
      },
      {
        href: '/settings/security',
        icon: Shield,
        title: 'Security',
        text: 'Review signed-in sessions and devices with notification access.',
      },
      {
        href: '/settings/blocked',
        icon: UserRoundX,
        title: 'Blocked people',
        text: 'Review people you have blocked and unblock them.',
      },
    ],
  },
  {
    id: 'account',
    title: 'Payments & account',
    text: 'Payment history and account management.',
    items: [
      {
        href: '/settings/orders',
        icon: Receipt,
        title: 'Orders and receipts',
        text: 'See Runner Pro, boost and verification payments.',
      },
      {
        href: '/settings/account',
        icon: UserRoundCog,
        title: 'Deactivate or delete account',
        text: 'Manage reversible deactivation or request account deletion.',
      },
    ],
  },
] as const;

export default function SettingsPage() {
  return (
    <div className="grid min-w-0 gap-4">
      <header className="px-1.5 pt-1">
        <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[.12em] text-green-800">Your account</p>
        <h1 className="text-[clamp(24px,3vw,32px)] font-extrabold leading-[1.15] tracking-[-0.03em] text-ink">Settings</h1>
        <p className="mt-1.5 text-sm text-muted">Manage your preferences, privacy and account in one place.</p>
      </header>

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        {GROUPS.map((group) => (
          <section
            key={group.id}
            aria-labelledby={`settings-${group.id}-heading`}
            className={`flex min-w-0 flex-col rounded-[var(--r-lg)] border p-4 shadow-[var(--shadow)] sm:p-[22px] ${
              group.id === 'preferences'
                ? 'border-[#dce9c4] bg-gradient-to-br from-[#f1fadb] to-surface'
                : 'border-line bg-surface'
            } ${group.id === 'account' ? 'xl:col-span-2' : ''}`}
          >
            <header className="mb-3">
              <h2 id={`settings-${group.id}-heading`} className="text-base font-extrabold tracking-tight text-ink">{group.title}</h2>
              <p className="mt-1 text-xs leading-5 text-muted">{group.text}</p>
            </header>
            <ul className={`-mx-2 grid divide-y divide-line ${group.id === 'account' ? 'xl:grid-cols-2 xl:divide-x xl:divide-y-0' : ''}`}>
              {group.items.map(({ href, icon: Icon, title, text }) => {
                const isAccountManagement = href === '/settings/account';
                return (
                  <li key={href} className="min-w-0">
                    <Link
                      href={href}
                      className={`group flex min-h-20 items-center gap-3.5 rounded-[var(--r-sm)] px-2 py-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800 motion-reduce:transition-none ${
                        isAccountManagement ? 'hover:bg-red-bg/70' : group.id === 'preferences' ? 'hover:bg-white/70' : 'hover:bg-panel'
                      }`}
                    >
                      <span className={`grid size-10 shrink-0 place-items-center rounded-[13px] ${isAccountManagement ? 'bg-red-bg text-red' : 'bg-tint-2 text-green-900'}`}>
                        <Icon className="size-[18px]" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className={`block text-[13.5px] font-bold ${isAccountManagement ? 'text-red' : 'text-ink'}`}>{title}</strong>
                        <span className="mt-1 block text-xs leading-5 text-muted">{text}</span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
            {group.id === 'preferences' && (
              <p className="mt-auto flex items-start gap-2 border-t border-[#dce9c4] pt-4 text-xs leading-5 text-green-900">
                <Repeat2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                Shared across requester and runner modes.
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
