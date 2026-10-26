import type { Conversation } from './api';

type Counterpart = Conversation['counterpart'];

const TONES = [
  'bg-tint-2 text-green-900',
  'bg-violet-bg text-violet',
  'bg-amber-bg text-amber',
  'bg-blue-bg text-blue',
];

/** A stable colour per conversation, as the demo's avatar variants. */
export function avatarTone(seed: string): string {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length]!;
}

export function initialsOf(first: string, last?: string | null): string {
  return `${first[0] ?? ''}${last?.[0] ?? first[1] ?? ''}`.toUpperCase();
}

export function counterpartName(person: Pick<Counterpart, 'firstName' | 'lastName'>): string {
  return person.lastName ? `${person.firstName} ${person.lastName[0]}.` : person.firstName;
}

/** "★ 4.9 · Verified runner" or "Requester · ★ 4.7", as in the demo. */
export function counterpartSubtitle(person: Pick<Counterpart, 'role' | 'rating'>): string {
  const rating = typeof person.rating === 'number' ? `★ ${person.rating.toFixed(1)}` : null;
  return person.role === 'RUNNER'
    ? [rating, 'Verified runner'].filter(Boolean).join(' · ')
    : ['Requester', rating].filter(Boolean).join(' · ');
}

const STATUS: Record<string, string> = {
  DRAFT: 'Draft',
  OPEN: 'Open for offers',
  RUNNER_SELECTED: 'Runner selected',
  ACCEPTED: 'Accepted',
  IN_PROGRESS: 'On the way',
  PICKED_UP: 'Picked up',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  DISPUTED: 'In dispute',
};

/** A service reads "work", not "pickup" and "delivery". */
const SERVICE_STATUS: Record<string, string> = { PICKED_UP: 'Work in progress', DELIVERED: 'Work finished' };

export function errandStatusLabel(status: string | null | undefined, flow?: string | null): string {
  if (!status) return '';
  return (flow === 'SERVICE' ? SERVICE_STATUS[status] : undefined) ?? STATUS[status] ?? status.replaceAll('_', ' ').toLowerCase();
}

export function money(minor: number | null | undefined): string {
  return minor === null || minor === undefined
    ? '—'
    : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(minor / 100);
}
