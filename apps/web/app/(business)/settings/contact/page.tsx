import Link from 'next/link';
import { ContactMethodsForm } from '@/features/settings/contact-methods-form';

export const metadata = { title: 'Contact methods — Urgent.ng' };

export default function ContactSettingsPage() {
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <div>
        <Link href="/settings" className="text-xs font-bold text-green-700 hover:underline">
          ← Settings
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">Contact methods</h1>
        <p className="mt-1 text-muted">
          Add a phone number or email to this account and verify it. You keep one profile, and no second
          account is created.
        </p>
      </div>
      <ContactMethodsForm />
    </div>
  );
}
