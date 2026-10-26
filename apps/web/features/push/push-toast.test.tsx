import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { showPushToast } from './push-toast';

// jsdom has no pointer capture, which the toast library uses for swipe-to-dismiss.
Element.prototype.setPointerCapture = vi.fn();
Element.prototype.releasePointerCapture = vi.fn();

afterEach(cleanup);

describe('push toast', () => {
  it('shows the title and message, opens the target and can be dismissed', async () => {
    const onOpen = vi.fn();
    render(<Toaster />);
    act(() => showPushToast({ title: 'New message', body: 'Tunde sent you a message about "Collect a parcel".', type: 'message.new', onOpen }));

    expect(await screen.findByText('New message')).toBeInTheDocument();
    expect(screen.getByText(/Tunde sent you a message/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
