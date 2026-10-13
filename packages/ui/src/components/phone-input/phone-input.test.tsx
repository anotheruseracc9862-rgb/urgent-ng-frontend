import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PhoneInput } from './phone-input';

describe('PhoneInput', () => {
  it('displays grouped digits and emits Nigerian E.164 for valid input', () => {
    const onChange = vi.fn();
    render(<PhoneInput aria-label="Mobile number" value="" onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Mobile number' });

    fireEvent.change(input, { target: { value: '08034567890' } });
    expect(input).toHaveValue('0803 456 7890');
    expect(onChange).toHaveBeenLastCalledWith('+2348034567890');
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
