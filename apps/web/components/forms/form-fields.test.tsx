import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useForm, useWatch } from 'react-hook-form';
import { LagosDateTimeFormField, MoneyFormField, PhoneFormField, SubmitButton } from './index';
import { useUnsavedChangesGuard } from './use-unsaved-changes-guard';

interface FormValues {
  amount: number | null;
  phone: string;
  scheduledAt: string | null;
}

function TestForm() {
  const form = useForm<FormValues>({
    defaultValues: { amount: null, phone: '', scheduledAt: null },
  });
  const values = useWatch({ control: form.control });

  return (
    <form>
      <MoneyFormField control={form.control} name="amount" label="Budget" />
      <PhoneFormField control={form.control} name="phone" label="Phone" />
      <LagosDateTimeFormField control={form.control} name="scheduledAt" label="Scheduled time" />
      <output aria-label="Current values">{JSON.stringify(values)}</output>
      <SubmitButton isSubmitting={false}>Save</SubmitButton>
    </form>
  );
}

describe('react-hook-form field components', () => {
  it('binds money, phone, and Lagos date-time controls to typed form values', () => {
    render(<TestForm />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Budget' }), { target: { value: '1,500.25' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Phone' }), { target: { value: '08034567890' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2099-10-13' } });
    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '18:30' } });

    expect(screen.getByLabelText('Current values')).toHaveTextContent(
      '{"amount":150025,"phone":"+2348034567890","scheduledAt":"2099-10-13T17:30:00.000Z"}',
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });
});

describe('submit and unsaved-change controls', () => {
  it('uses an explicit busy state and prevents accidental internal navigation', () => {
    function GuardedLink() {
      useUnsavedChangesGuard(true);
      return <a href="/dashboard">Leave form</a>;
    }
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <>
        <SubmitButton isSubmitting>Saving changes…</SubmitButton>
        <GuardedLink />
      </>,
    );

    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    const linkClick = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    fireEvent(screen.getByRole('link', { name: 'Leave form' }), linkClick);
    expect(confirm).toHaveBeenCalledOnce();
    expect(linkClick.defaultPrevented).toBe(true);

    const unload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
  });
});
