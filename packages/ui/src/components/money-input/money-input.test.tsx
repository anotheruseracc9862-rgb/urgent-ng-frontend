import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MoneyInput } from './money-input';

describe('MoneyInput', () => {
  it('emits integer kobo and supports clearing a nullable controlled value', () => {
    const onChange = vi.fn();
    render(<MoneyInput aria-label="Budget" value={null} onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Budget' });

    fireEvent.change(input, { target: { value: '₦1,500.25' } });
    expect(onChange).toHaveBeenLastCalledWith(150025);

    fireEvent.change(input, { target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('does not convert invalid precision into an amount', () => {
    const onChange = vi.fn();
    render(<MoneyInput aria-label="Budget" value={null} onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Budget' }), { target: { value: '12.345' } });
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('formats the display after blur without changing the integer amount', () => {
    const onChange = vi.fn();
    render(<MoneyInput aria-label="Budget" value={150025} onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Budget' });

    expect(input).toHaveValue('1,500.25');
    fireEvent.blur(input);
    expect(input).toHaveValue('1,500.25');
    expect(onChange).not.toHaveBeenCalled();
  });
});
