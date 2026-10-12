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
  // Remove currency symbol, whitespace, and commas
  const cleaned = input.replace(/[₦\s,]/g, '');
  
  // Check if valid number format
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) {
    return null;
  }
  
  const naira = parseFloat(cleaned);
  if (isNaN(naira) || naira < 0) {
    return null;
  }
  
  return Math.round(naira * 100);
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
