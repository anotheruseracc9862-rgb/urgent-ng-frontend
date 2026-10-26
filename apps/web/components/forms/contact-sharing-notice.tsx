import { LockKeyhole } from 'lucide-react';

/** Backend PRD 19: phone numbers are released after the runner accepts, and free text may not carry them before. */
export function ContactSharingNotice({ className = '' }: { className?: string }) {
  return (
    <p className={`flex items-start gap-2 rounded-[var(--r-sm)] bg-tint px-3 py-2.5 text-xs leading-relaxed text-green-900 ${className}`}>
      <LockKeyhole aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      <span>Urgent.ng shares phone numbers and emails only after the runner accepts. Messages that include them cannot be sent until then.</span>
    </p>
  );
}
