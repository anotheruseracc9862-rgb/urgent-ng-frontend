/**
 * Phone, email and verification context carried between the register, verify, forgot-password,
 * reset and login screens. It lives in memory only: never in a URL, `localStorage` or
 * `sessionStorage` (Frontend Build Plan §6). A full reload clears it and the person re-enters it.
 */

export interface PendingVerify {
  via: 'phone' | 'email';
  phone?: string;
  email?: string;
}

let verify: PendingVerify | null = null;
let identifier: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function setPendingVerify(value: PendingVerify | null): void {
  verify = value;
  emit();
}

export function setPendingIdentifier(value: string | null): void {
  identifier = value;
  emit();
}

export function clearPendingIdentity(): void {
  verify = null;
  identifier = null;
  emit();
}

export function subscribePending(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readPendingVerify(): PendingVerify | null {
  return verify;
}

export function readPendingIdentifier(): string | null {
  return identifier;
}
