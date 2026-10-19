import { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { DurationInput, formatDuration } from './duration-input';

afterEach(() => cleanup());

function Harness({ initial = null }: { initial?: number | null }) {
  const [value, setValue] = useState<number | null>(initial);
  return (
    <>
      <DurationInput id="time" value={value} onChange={setValue} />
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
});
