import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readErrandDraft } from '@/lib/drafts/errand-draft';
import { QuickPostDialog } from './quick-post-dialog';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

beforeEach(() => { push.mockReset(); sessionStorage.clear(); });
afterEach(cleanup);

function open() {
  render(<QuickPostDialog />);
  fireEvent.click(screen.getByRole('button', { name: 'Quick post' }));
}

describe('Quick post', () => {
  it('asks for the essentials and refuses an empty form', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText(/Say what needs to be done/)).toBeTruthy();
    expect(screen.getByText('Add the pickup area.')).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });

  it('hands the values to the full post form', () => {
    open();
    fireEvent.change(screen.getByLabelText(/What do you need done/), { target: { value: 'Pick up groceries' } });
    fireEvent.change(screen.getByLabelText('Pickup area'), { target: { value: 'Lekki Phase 1' } });
    fireEvent.change(screen.getByLabelText(/Suggested budget/), { target: { value: '5,000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(push).toHaveBeenCalledWith('/errands/new');
    expect(readErrandDraft()).toMatchObject({ title: 'Pick up groceries', pickup: 'Lekki Phase 1', budgetNaira: 5000 });
  });
});
