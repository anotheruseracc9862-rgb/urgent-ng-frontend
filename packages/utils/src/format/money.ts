/**
 * Format kobo (integer cents) to Naira string with ₦ symbol
 * @param kobo - Amount in kobo (smallest currency unit)
 * @returns Formatted string like "₦1,234.56"
 */
export function formatMoney(kobo: number): string {
  const naira = kobo / 100;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(naira);
}

/**
 * Parse money input string to kobo
 * Accepts formats like: "1234.56", "1,234.56", "₦1,234.56", "1234"
 * @param input - String input from user
 * @returns Integer kobo amount, or null if invalid
 */
export function parseMoneyToKobo(input: string): number | null {
  const cleaned = input.trim().replace(/^₦\s*/, '');
  const match = /^(?:(\d+)|(\d{1,3}(?:,\d{3})+))(?:\.(\d{0,2}))?$/.exec(cleaned);
  if (!match) return null;

  const naira = Number((match[1] ?? match[2]!).replace(/,/g, ''));
  if (!Number.isSafeInteger(naira) || naira > Math.floor(Number.MAX_SAFE_INTEGER / 100)) return null;
  const kobo = naira * 100 + Number((match[3] ?? '').padEnd(2, '0') || '0');
  return Number.isSafeInteger(kobo) ? kobo : null;
}

/**
 * Format kobo amount without currency symbol (for input fields)
 * @param kobo - Amount in kobo
 * @returns Formatted string like "1,234.56"
 */
export function formatMoneyInput(kobo: number): string {
  const naira = kobo / 100;
  return naira.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
