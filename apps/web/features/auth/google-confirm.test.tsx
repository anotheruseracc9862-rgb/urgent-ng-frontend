import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { afterEach, expect, it, vi } from 'vitest';

const script = vi.hoisted(() => ({ loaded: false }));
vi.mock('next/script', () => ({
  default: function Script({ onLoad, onReady }: { onLoad?: () => void; onReady?: () => void }) {
    useEffect(() => {
      if (!script.loaded) {
        script.loaded = true;
        onLoad?.();
      }
      onReady?.();
    }, [onLoad, onReady]);
    return null;
  },
}));

afterEach(() => {
  cleanup();
  delete window.google;
  script.loaded = false;
  vi.unstubAllEnvs();
});

it('shows a working Google confirmation button again when its script is already loaded', async () => {
  vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-client.apps.googleusercontent.com');
  vi.resetModules();
  const { GoogleConfirm } = await import('./google-confirm');
  let credential: ((response: { credential: string }) => void) | undefined;
  window.google = {
    accounts: {
      id: {
        initialize: ({ callback }) => { credential = callback; },
        renderButton: (element) => {
          const button = document.createElement('button');
          button.textContent = 'Continue with Google';
          button.onclick = () => credential?.({ credential: 'test-confirmation-token' });
          element.replaceChildren(button);
        },
      },
    },
  };
  const onToken = vi.fn();
  const user = userEvent.setup();
  const first = render(<GoogleConfirm onToken={onToken} />);
  await user.click(await screen.findByRole('button', { name: 'Continue with Google' }));
  expect(onToken).toHaveBeenLastCalledWith('test-confirmation-token');

  first.unmount();
  onToken.mockClear();
  render(<GoogleConfirm onToken={onToken} />);
  await user.click(await screen.findByRole('button', { name: 'Continue with Google' }));
  expect(onToken).toHaveBeenCalledWith('test-confirmation-token');
});
