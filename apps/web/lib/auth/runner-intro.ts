/**
 * Whether this person has already been shown the explanation for a mode. A per-user,
 * non-sensitive flag; it only decides whether the intro dialog appears.
 */
type Mode = 'REQUESTER' | 'RUNNER';

const key = (userId: string, mode: Mode) => `urgent.mode-intro-seen.${mode}.${userId}`;

export function hasSeenModeIntro(userId: string, mode: Mode): boolean {
  try {
    return localStorage.getItem(key(userId, mode)) === '1';
  } catch {
    // Storage blocked: show the intro each time rather than hide it.
    return false;
  }
}

export function markModeIntroSeen(userId: string, mode: Mode): void {
  try {
    localStorage.setItem(key(userId, mode), '1');
  } catch {
    // Nothing to remember.
  }
}
