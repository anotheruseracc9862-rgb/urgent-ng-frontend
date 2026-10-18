import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PhoneInput } from './phone-input';

describe('PhoneInput', () => {
  it('shows the local format as typed and emits Nigerian E.164 for valid input', () => {
    const onChange = vi.fn();
    render(<PhoneInput aria-label="Mobile number" value="" onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Mobile number' });

    fireEvent.change(input, { target: { value: '08034567890' } });
    expect(input).toHaveValue('08034567890');
    expect(onChange).toHaveBeenLastCalledWith('+2348034567890');
  });

  it('fills a stored +234 number in the local format', () => {
    render(<PhoneInput aria-label="Mobile number" value="+2348034567890" />);
    expect(screen.getByRole('textbox', { name: 'Mobile number' })).toHaveValue('08034567890');
  });

  it('does not normalize +234 or 234 input: it is emitted as typed', () => {
    const onChange = vi.fn();
    render(<PhoneInput aria-label="Mobile number" value="" onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Mobile number' });

    fireEvent.change(input, { target: { value: '+2348034567890' } });
    expect(onChange).toHaveBeenLastCalledWith('+2348034567890');
    fireEvent.change(input, { target: { value: '2348034567890' } });
    expect(onChange).toHaveBeenLastCalledWith('2348034567890');
  });

  it('does not normalize unsupported Nigerian prefixes', () => {
    const onChange = vi.fn();
    render(<PhoneInput aria-label="Mobile number" value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Mobile number' }), {
      target: { value: '07601234567' },
    });
    expect(onChange).toHaveBeenLastCalledWith('07601234567');
  });
});
