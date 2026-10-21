import { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { DurationInput, estimateLabel, formatDuration } from './duration-input';

afterEach(() => cleanup());

function Harness({ initial = null, maxMinutes }: { initial?: number | null; maxMinutes?: number }) {
  const [value, setValue] = useState<number | null>(initial);
  return (
    <>
      <DurationInput id="time" value={value} onChange={setValue} maxMinutes={maxMinutes} />
      <output aria-label="Total">{value === null ? 'none' : value}</output>
    </>
  );
}

describe('DurationInput', () => {
  it('turns hours and minutes into total minutes', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('Hours'), '2');
    await user.type(screen.getByLabelText('Minutes'), '15');

    expect(screen.getByLabelText('Total')).toHaveTextContent('135');
    expect(screen.getByText('About 2 hrs 15 min')).toBeInTheDocument();
  });

  it('fills both fields from a preset and caps at 24 hours', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: '2 hrs' }));
    expect(screen.getByLabelText('Hours')).toHaveValue('2');
    expect(screen.getByLabelText('Total')).toHaveTextContent('120');

    await user.clear(screen.getByLabelText('Hours'));
    await user.type(screen.getByLabelText('Hours'), '30');
    expect(screen.getByLabelText('Total')).toHaveTextContent('1440');
  });

  it('formats durations for display', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(60)).toBe('1 hr');
    expect(formatDuration(90)).toBe('1 hr 30 min');
  });

  it('formats a day or more in days, leaving the minutes out', () => {
    expect(formatDuration(1439)).toBe('23 hrs 59 min');
    expect(formatDuration(1440)).toBe('1 day');
    expect(formatDuration(1620)).toBe('1 day 3 hrs');
    expect(formatDuration(2 * 1440)).toBe('2 days');
    expect(formatDuration(3 * 1440 + 4 * 60 + 15)).toBe('3 days 4 hrs');
    expect(formatDuration(14 * 1440)).toBe('14 days');
  });

  it('has no days field when the limit is a day, as for a delivery', () => {
    render(<Harness />);
    expect(screen.queryByLabelText('Days')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '2 days' })).not.toBeInTheDocument();
  });
});

describe('estimateLabel', () => {
  // Noon in Lagos on Thursday 22 October 2026.
  const now = new Date('2026-10-22T11:00:00.000Z');

  it('is just the length for anything under a day', () => {
    expect(estimateLabel(45, now)).toBe('45 min');
    expect(estimateLabel(6 * 60, now)).toBe('6 hrs');
    expect(estimateLabel(1439, now)).toBe('23 hrs 59 min');
  });

  it('adds the day it would be done by, from a day up, so offers can be compared', () => {
    expect(estimateLabel(1440, now)).toMatch(/^1 day · done by Fri,? 23 Oct$/);
    expect(estimateLabel(2 * 1440, now)).toMatch(/^2 days · done by Sat,? 24 Oct$/);
    expect(estimateLabel(7 * 1440, now)).toMatch(/^7 days · done by Thu,? 29 Oct$/);
  });
});

describe('DurationInput for a job that may take days', () => {
  const FOURTEEN_DAYS = 14 * 24 * 60;

  it('offers days, hours and minutes, and presets up to a week', () => {
    render(<Harness maxMinutes={FOURTEEN_DAYS} />);
    for (const name of ['Days', 'Hours', 'Minutes']) expect(screen.getByLabelText(name)).toBeInTheDocument();
    for (const name of ['1 hr', '4 hrs', '1 day', '2 days', '3 days', '1 week']) expect(screen.getByRole('button', { name })).toBeInTheDocument();
  });

  it('turns days and hours into total minutes', async () => {
    const user = userEvent.setup();
    render(<Harness maxMinutes={FOURTEEN_DAYS} />);

    await user.type(screen.getByLabelText('Days'), '3');
    await user.type(screen.getByLabelText('Hours'), '4');

    expect(screen.getByLabelText('Total')).toHaveTextContent(String(3 * 1440 + 240));
    expect(screen.getByText('About 3 days 4 hrs')).toBeInTheDocument();
  });

  it('fills the fields from a preset, and a short job is still a few hours', async () => {
    const user = userEvent.setup();
    render(<Harness maxMinutes={FOURTEEN_DAYS} />);

    await user.click(screen.getByRole('button', { name: '2 days' }));
    expect(screen.getByLabelText('Days')).toHaveValue('2');
    expect(screen.getByLabelText('Total')).toHaveTextContent('2880');

    await user.click(screen.getByRole('button', { name: '2 hrs' }));
    expect(screen.getByLabelText('Days')).toHaveValue('');
    expect(screen.getByLabelText('Hours')).toHaveValue('2');
    expect(screen.getByLabelText('Total')).toHaveTextContent('120');
  });

  it('stops at the limit and shows it as the limit, not as an overflowing number', async () => {
    const user = userEvent.setup();
    render(<Harness maxMinutes={FOURTEEN_DAYS} />);

    await user.type(screen.getByLabelText('Days'), '30');

    expect(screen.getByLabelText('Total')).toHaveTextContent(String(FOURTEEN_DAYS));
    expect(screen.getByLabelText('Days')).toHaveValue('14');
    expect(screen.getByText('About 14 days')).toBeInTheDocument();
  });

  it('shows a value it was given in days', () => {
    render(<Harness initial={4320} maxMinutes={FOURTEEN_DAYS} />);
    expect(screen.getByLabelText('Days')).toHaveValue('3');
    expect(screen.getByText('About 3 days')).toBeInTheDocument();
  });

  it('only offers presets within a smaller limit', () => {
    render(<Harness maxMinutes={3 * 1440} />);
    expect(screen.getByRole('button', { name: '3 days' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '1 week' })).not.toBeInTheDocument();
  });
});
