import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LagosDateTimeField } from './lagos-date-time-field';

describe('LagosDateTimeField', () => {
  it('renders Lagos date/time inputs and emits ISO UTC values', () => {
    const onChange = vi.fn();
    render(
      <LagosDateTimeField
        id="scheduled-at"
        label="Scheduled time"
        value={null}
        onChange={onChange}
        required
      />,
    );

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '13/10/2099' } });
    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '18:30' } });

    expect(onChange).toHaveBeenLastCalledWith('2099-10-13T17:30:00.000Z');
  });

  it('reflects a server-controlled timestamp as Lagos wall time', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <LagosDateTimeField id="scheduled-at" label="Scheduled time" value={null} onChange={onChange} />,
    );

    rerender(
      <LagosDateTimeField
        id="scheduled-at"
        label="Scheduled time"
        value="2026-10-13T17:30:00.000Z"
        onChange={onChange}
      />,
    );

    expect(screen.getByLabelText('Date')).toHaveValue('13/10/2026');
    expect(screen.getByLabelText('Time')).toHaveValue('18:30');
  });

  it('rejects a typed date in the past', () => {
    const onChange = vi.fn();
    render(<LagosDateTimeField id="scheduled-at" label="Scheduled time" value={null} onChange={onChange} />);

    const date = screen.getByLabelText('Date') as HTMLInputElement;
    fireEvent.change(date, { target: { value: '01/01/2020' } });

    expect(date.validationMessage).toBe('This date has already passed.');
    expect(onChange).not.toHaveBeenCalledWith(expect.stringContaining('2020'));
  });
});
