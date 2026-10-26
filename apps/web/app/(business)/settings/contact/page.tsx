import { PageHead } from '@/components/shell/page-head';
import { ContactMethodsForm } from '@/features/settings/contact-methods-form';

export const metadata = { title: 'Contact methods — Urgent.ng' };

export default function ContactSettingsPage() {
  return (
    <div className="grid min-w-0 content-start gap-4 pb-10">
      <PageHead
        eyebrow="Account"
        title="Contact methods"
        description="Add a phone number or email to this account and verify it. You keep one profile, and no second account is created."
      />
      <ContactMethodsForm />
    </div>
  );
}
