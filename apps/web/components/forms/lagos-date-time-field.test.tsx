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

    fireEvent.change(screen.getByLabelText('Date (Lagos)'), { target: { value: '2026-10-13' } });
    fireEvent.change(screen.getByLabelText('Time (Lagos)'), { target: { value: '18:30' } });

    expect(onChange).toHaveBeenLastCalledWith('2026-10-13T17:30:00.000Z');
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

    expect(screen.getByLabelText('Date (Lagos)')).toHaveValue('2026-10-13');
    expect(screen.getByLabelText('Time (Lagos)')).toHaveValue('18:30');
  });
});
