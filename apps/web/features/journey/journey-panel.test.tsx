import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { buildJourney } from './journey';
import { JourneyPanel } from './journey-panel';

afterEach(cleanup);

describe('JourneyPanel on a phone', () => {
  it('is one pill that names the step, with the other steps hidden', () => {
    render(<JourneyPanel view={buildJourney({ role: 'REQUESTER', errandStatus: 'OPEN' })} />);
    const pill = screen.getByRole('button', { name: /Step 1 of 7: Offers/ });
    expect(pill).toHaveAttribute('aria-expanded', 'false');
    // Only the wide bar's list is in the page until the pill is opened.
    expect(screen.getAllByRole('list')).toHaveLength(1);
  });

  it('lists every step when the pill is tapped, with where you are marked, and closes again', () => {
    render(<JourneyPanel view={buildJourney({ role: 'REQUESTER', errandStatus: 'OPEN', offer: { status: 'ACTIVE' } })} />);
    const pill = screen.getByRole('button');
    fireEvent.click(pill);

    expect(pill).toHaveAttribute('aria-expanded', 'true');
    const all = document.getElementById(pill.getAttribute('aria-controls')!)!;
    const rows = within(all).getAllByRole('listitem');
    expect(rows).toHaveLength(7);
    expect(rows.map((row) => row.textContent?.replace(/^\d+/, '').replace(/\s*\((done|now|stopped)\)$/, ''))).toEqual(['Offers', 'Negotiate', 'Select runner', 'Payment terms', 'Errand runs', 'Confirm', 'Rate']);
    expect(rows[0]).toHaveTextContent('(done)');
    expect(rows[1]).toHaveAttribute('aria-current', 'step');
    expect(rows[1]).toHaveTextContent('(now)');
    expect(rows[2]).not.toHaveAttribute('aria-current');

    fireEvent.click(pill);
    expect(pill).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById(pill.getAttribute('aria-controls')!)).toBeNull();
  });

  it('marks a stopped journey in the list', () => {
    render(<JourneyPanel view={buildJourney({ role: 'REQUESTER', errandStatus: 'CANCELLED' })} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getAllByRole('listitem').some((item) => item.textContent?.includes('(stopped)'))).toBe(true);
  });

  it('uses the runner labels for a runner', () => {
    render(<JourneyPanel view={buildJourney({ role: 'RUNNER', errandStatus: 'RUNNER_SELECTED', assignment: { status: 'PENDING_ACCEPTANCE' } })} />);
    expect(screen.getByRole('button')).toHaveTextContent('Step 3 of 7: Accept job');
  });
});
