import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BoostBadge, BoostResults, boostEndsLabel, boostLengthLabel } from './boost-badge';

afterEach(cleanup);

// 10:00 in Lagos (UTC+1) on 22 Oct 2026.
const now = new Date('2026-10-22T09:00:00.000Z');

describe('boostEndsLabel', () => {
  it('says today, tomorrow, or the date, in Lagos time', () => {
    expect(boostEndsLabel('2026-10-22T14:20:00.000Z', now)).toBe('today 3:20 pm');
    expect(boostEndsLabel('2026-10-23T09:00:00.000Z', now)).toBe('tomorrow 10:00 am');
    expect(boostEndsLabel('2026-10-27T09:00:00.000Z', now)).toMatch(/^27 Oct 10:00 am$/);
  });

  it('uses the Lagos day, not the UTC day, near midnight', () => {
    // 23:30 UTC is 00:30 the next day in Lagos.
    expect(boostEndsLabel('2026-10-22T23:30:00.000Z', now)).toBe('tomorrow 12:30 am');
  });
});

describe('BoostBadge', () => {
  it('marks a boosted errand with when it ends', () => {
    render(<BoostBadge boost={{ expiresAt: new Date(Date.now() + 3_600_000).toISOString() }} />);
    expect(screen.getByText('Boosted')).toBeInTheDocument();
    expect(screen.getByText(/until /)).toBeInTheDocument();
  });

  it('renders nothing for an errand with no boost', () => {
    const { container } = render(<BoostBadge boost={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('boostLengthLabel', () => {
  const at = (minutes: number) => new Date(now.getTime() + minutes * 60_000).toISOString();

  it('says how long a boost bought now would run', () => {
    expect(boostLengthLabel(at(24 * 60), now)).toBe('about 24 hours');
    expect(boostLengthLabel(at(120), now)).toBe('about 2 hours');
    expect(boostLengthLabel(at(60), now)).toBe('about 1 hour');
    expect(boostLengthLabel(at(90), now)).toBe('about 1 hour 30 minutes');
    expect(boostLengthLabel(at(45), now)).toBe('about 45 minutes');
    expect(boostLengthLabel(at(1), now)).toBe('about 1 minute');
  });

  it('rounds a near-whole hour to the hour', () => {
    expect(boostLengthLabel(at(122), now)).toBe('about 2 hours');
    expect(boostLengthLabel(at(118), now)).toBe('about 2 hours');
  });
});

describe('BoostResults', () => {
  const boost = { expiresAt: '2026-10-23T09:00:00.000Z', startedAt: '2026-10-22T09:00:00.000Z', openedByCount: 14, offersSinceCount: 3 };

  it('shows only counts', () => {
    render(<BoostResults boost={boost} />);
    expect(screen.getByText(/Since boosting:/)).toBeInTheDocument();
    expect(screen.getByText(/opened by 14 runners · 3 offers/)).toBeInTheDocument();
  });

  it('speaks of one runner and one offer in the singular, and shows a plain zero', () => {
    render(<BoostResults boost={{ ...boost, openedByCount: 1, offersSinceCount: 1 }} />);
    expect(screen.getByText(/opened by 1 runner · 1 offer$/)).toBeInTheDocument();
    cleanup();
    render(<BoostResults boost={{ ...boost, openedByCount: 0, offersSinceCount: 0 }} />);
    expect(screen.getByText(/opened by 0 runners · 0 offers/)).toBeInTheDocument();
  });

  it('renders nothing without a boost', () => {
    const { container } = render(<BoostResults boost={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
