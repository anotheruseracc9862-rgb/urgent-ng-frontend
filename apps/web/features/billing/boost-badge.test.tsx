import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BoostBadge, boostEndsLabel } from './boost-badge';

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
