import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DateOfBirthPicker } from './date-of-birth-picker';

afterEach(() => cleanup());

describe('DateOfBirthPicker', () => {
  it('selects a date using the month and year calendar', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateOfBirthPicker value="" max="2008-10-18" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Choose date of birth' }));

    const calendar = screen.getByRole('dialog', { name: 'Choose your date of birth' });
    expect(calendar).toBeInTheDocument();
    expect(calendar).toHaveStyle({ position: 'fixed', visibility: 'visible' });
    expect(screen.getByRole('combobox', { name: 'Year' })).toHaveValue('2008');
    expect(screen.getByRole('button', { name: '19/10/2008' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '17/10/2008' }));

    expect(screen.getByLabelText('Date of birth')).toHaveValue('17/10/2008');
    expect(onChange).toHaveBeenLastCalledWith('2008-10-17');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('accepts a typed date and blocks invalid or underage dates', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateOfBirthPicker value="" max="2008-10-18" onChange={onChange} />);
    const input = screen.getByLabelText('Date of birth');

    await user.type(input, '01/01/1990');
    expect(onChange).toHaveBeenLastCalledWith('1990-01-01');

    await user.clear(input);
    await user.type(input, '31/02/1990');
    expect(onChange).toHaveBeenLastCalledWith('');
    expect((input as HTMLInputElement).validationMessage).toBe('Enter a valid date as DD/MM/YYYY.');

    await user.clear(input);
    await user.type(input, '19/10/2008');
    expect((input as HTMLInputElement).validationMessage).toBe('You must be at least 18 years old.');
  });

  it('closes the calendar when the user clicks outside it', async () => {
    const user = userEvent.setup();
    render(
      <>
        <DateOfBirthPicker value="" max="2008-10-18" onChange={vi.fn()} />
        <button type="button">Outside picker</button>
      </>,
    );

    await user.click(screen.getByRole('button', { name: 'Choose date of birth' }));
    expect(screen.getByRole('dialog', { name: 'Choose your date of birth' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Outside picker' }));
    expect(screen.queryByRole('dialog', { name: 'Choose your date of birth' })).not.toBeInTheDocument();
  });
});
