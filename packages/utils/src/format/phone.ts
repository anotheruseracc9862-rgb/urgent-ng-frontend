/**
 * Format Nigerian phone number for display
 * @param phone - Phone number in any format
 * @returns Formatted string like "+234 803 456 7890" or null if invalid
 */
export function formatPhone(phone: string): string | null {
  const cleaned = phone.replace(/\D/g, '');
  
  // Handle +234 format (13 digits: 234 + 10)
  if (cleaned.startsWith('234') && cleaned.length === 13) {
    return `+234 ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }
  
  // Handle 0 format (11 digits: 0 + 10)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  
  return null;
}

/**
 * Normalize Nigerian phone number to E.164 format (+234...)
 * @param phone - Phone number in any format
 * @returns E.164 format like "+2348034567890" or null if invalid
 */
export function normalizePhone(phone: string): string | null {
  const cleaned = phone.replace(/\D/g, '');
  
  // Already in +234 format
  if (cleaned.startsWith('234') && cleaned.length === 13) {
    return `+${cleaned}`;
  }
  
  // Convert from 0 format
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return `+234${cleaned.slice(1)}`;
  }
  
  // Just 10 digits (assume Nigerian)
  if (cleaned.length === 10) {
    return `+234${cleaned}`;
  }
  
  return null;
}

/**
 * Validate Nigerian phone number
 * @param phone - Phone number in any format
 * @returns true if valid Nigerian number
 */
export function isValidPhone(phone: string): boolean {
  return normalizePhone(phone) !== null;
}
