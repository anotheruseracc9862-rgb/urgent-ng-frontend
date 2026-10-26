import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OfferSentBanner, markOfferJustSent } from './offer-sent-banner';

vi.mock('@/features/push/push-opt-in-prompt', () => ({ PushOptInPrompt: () => <section aria-label="Push notification option" /> }));

afterEach(() => {
  cleanup();
  // Nothing carries over between tests: whatever is still pending is taken by an ordinary visit.
  render(<OfferSentBanner offerId="offer-1" />);
  render(<OfferSentBanner offerId="offer-2" />);
  cleanup();
});

describe('OfferSentBanner', () => {
  it('confirms a fresh send and offers push, once', () => {
    markOfferJustSent('offer-1');
    const { unmount } = render(<OfferSentBanner offerId="offer-1" />);
    expect(screen.getByRole('status', { name: 'Offer sent' })).toHaveTextContent('Your offer is on its way');
    expect(screen.getByLabelText('Push notification option')).toBeInTheDocument();

    // A reload or a later visit does not bring it back.
    unmount();
    render(<OfferSentBanner offerId="offer-1" />);
    expect(screen.queryByRole('status', { name: 'Offer sent' })).not.toBeInTheDocument();
  });

  it('can be dismissed, and takes the push prompt with it', () => {
    markOfferJustSent('offer-1');
    render(<OfferSentBanner offerId="offer-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('status', { name: 'Offer sent' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Push notification option')).not.toBeInTheDocument();
  });

  it('stays away from an ordinary visit and from a different offer', () => {
    render(<OfferSentBanner offerId="offer-1" />);
    expect(screen.queryByRole('status', { name: 'Offer sent' })).not.toBeInTheDocument();

    markOfferJustSent('offer-2');
    cleanup();
    render(<OfferSentBanner offerId="offer-1" />);
    expect(screen.queryByRole('status', { name: 'Offer sent' })).not.toBeInTheDocument();
  });
});
