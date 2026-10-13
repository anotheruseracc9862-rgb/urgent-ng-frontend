/**
 * The landing-page request form hands its values to the post-errand flow (F3) through
 * `sessionStorage`: tab-scoped, never in a URL, and cleared on logout.
 */
export const ERRAND_DRAFT_KEY = 'urgent.errandDraft';

export interface ErrandDraft {
  budgetNaira: number;
  title: string;
  pickup: string;
  destination: string;
  category: string;
  urgency: string;
  description?: string;
}

export function saveErrandDraft(draft: ErrandDraft): void {
  try {
    sessionStorage.setItem(ERRAND_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Storage can be blocked; the person just fills the form again after sign-up.
  }
}

export function readErrandDraft(): ErrandDraft | null {
  try {
    const raw = sessionStorage.getItem(ERRAND_DRAFT_KEY);
    return raw ? (JSON.parse(raw) as ErrandDraft) : null;
  } catch {
    return null;
  }
}

export function clearErrandDraft(): void {
  try {
    sessionStorage.removeItem(ERRAND_DRAFT_KEY);
  } catch {
    // Nothing to clear.
  }
}
