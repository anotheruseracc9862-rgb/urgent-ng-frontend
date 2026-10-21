import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrandPostedBanner, markErrandJustPosted } from './errand-posted-banner';

vi.mock('@/features/push/push-opt-in-prompt', () => ({ PushOptInPrompt: () => <section aria-label="Push notification option" /> }));

afterEach(() => {
  cleanup();
  // Nothing carries over between tests: whatever is still pending is taken by an ordinary visit.
  render(<ErrandPostedBanner errandId="errand-1" status="CANCELLED" />);
  render(<ErrandPostedBanner errandId="errand-2" status="CANCELLED" />);
  cleanup();
});

describe('ErrandPostedBanner', () => {
  it('confirms a fresh post and offers push, once', () => {
    markErrandJustPosted('errand-1');
    const { unmount } = render(<ErrandPostedBanner errandId="errand-1" status="OPEN" />);
    expect(screen.getByRole('status', { name: 'Errand posted' })).toHaveTextContent('Your errand is live');
    expect(screen.getByLabelText('Push notification option')).toBeInTheDocument();

    // A reload or a later visit does not bring it back.
    unmount();
    render(<ErrandPostedBanner errandId="errand-1" status="OPEN" />);
    expect(screen.queryByRole('status', { name: 'Errand posted' })).not.toBeInTheDocument();
  });

  it('can be dismissed, and takes the push prompt with it', () => {
    markErrandJustPosted('errand-1');
    render(<ErrandPostedBanner errandId="errand-1" status="OPEN" />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('status', { name: 'Errand posted' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Push notification option')).not.toBeInTheDocument();
  });

  it('stays away from an ordinary visit and from a different errand', () => {
    render(<ErrandPostedBanner errandId="errand-1" status="OPEN" />);
    expect(screen.queryByRole('status', { name: 'Errand posted' })).not.toBeInTheDocument();

    markErrandJustPosted('errand-2');
    cleanup();
    render(<ErrandPostedBanner errandId="errand-1" status="OPEN" />);
    expect(screen.queryByRole('status', { name: 'Errand posted' })).not.toBeInTheDocument();
  });

  it('says nothing about an errand that is no longer open', () => {
    markErrandJustPosted('errand-1');
    render(<ErrandPostedBanner errandId="errand-1" status="CANCELLED" />);
    expect(screen.queryByRole('status', { name: 'Errand posted' })).not.toBeInTheDocument();
  });
});
