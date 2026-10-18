const VALID_PREFIXES = new Set(['70', '80', '81', '90', '91']);

function nationalNumber(phone: string): string | null {
  const cleaned = phone.trim().replace(/[\s\-.()]/g, '');
  if (!/^\+?\d+$/.test(cleaned)) return null;

  let national: string | undefined;
  let match: RegExpExecArray | null;
  if ((match = /^0(\d{10})$/.exec(cleaned))) national = match[1];
  else if ((match = /^(\d{10})$/.exec(cleaned))) national = match[1];
  else if ((match = /^\+?234(\d{10})$/.exec(cleaned))) national = match[1];
  else if ((match = /^\+?2340(\d{10})$/.exec(cleaned))) national = match[1];

  return national && VALID_PREFIXES.has(national.slice(0, 2)) ? national : null;
}

/**
 * Format a valid Nigerian mobile number for display.
 * @returns Formatted national or E.164 string, or null if invalid.
 */
export function formatPhone(phone: string): string | null {
  const national = nationalNumber(phone);
  if (!national) return null;
  const input = phone.trim().replace(/[\s\-.()]/g, '');
  if (/^0\d{10}$/.test(input)) return `0${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
  return `+234 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
}

/**
 * Normalize Nigerian phone number to E.164 format (+234...)
 * @param phone - Phone number in any format
 * @returns E.164 format like "+2348034567890" or null if invalid
 */
export function normalizePhone(phone: string): string | null {
  const national = nationalNumber(phone);
  return national ? `+234${national}` : null;
}

/**
 * Validate Nigerian phone number
 * @param phone - Phone number in any format
 * @returns true if valid Nigerian number
 */
export function isValidPhone(phone: string): boolean {
  return normalizePhone(phone) !== null;
}

/** What a phone field tells the person when the number is not in the one accepted format. */
export const LOCAL_PHONE_ERROR = 'Enter an 11-digit mobile number starting with 0, e.g. 08031234567.';

/**
 * True for the one format phone fields accept: 11 digits starting with 0 and a Nigerian mobile
 * prefix (070, 080, 081, 090, 091). Spaces, hyphens, "+234" and "234" are not accepted.
 */
export function isLocalPhone(phone: string): boolean {
  const value = phone.trim();
  return /^0\d{10}$/.test(value) && isValidPhone(value);
}

/** 08031234567 -> +2348031234567, or null when the input is not in the accepted local format. */
export function localPhoneToE164(phone: string): string | null {
  return isLocalPhone(phone) ? normalizePhone(phone.trim()) : null;
}

/**
 * +2348031234567 -> 08031234567, for filling a field from a stored number. Anything that is not
 * a +234 number (an email, an empty string) is returned unchanged.
 */
export function e164ToLocalPhone(value: string): string {
  const match = /^\+234(\d{10})$/.exec(value.trim());
  return match ? `0${match[1]}` : value;
}
