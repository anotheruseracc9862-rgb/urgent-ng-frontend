import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingFlow } from './onboarding-flow';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => '/onboarding',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/api/auth', () => ({ authApi: { updateMe: vi.fn() } }));

beforeEach(() => {
  // An older build stored the sign-up default here, which pre-selected the first card.
  sessionStorage.setItem('urgent.intent', 'REQUESTER');
});
afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

describe('OnboardingFlow', () => {
  it('starts with neither mode selected', () => {
    render(<OnboardingFlow />);

    for (const name of [/Get an errand done/, /Run errands and earn/]) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false');
    }
  });
});
