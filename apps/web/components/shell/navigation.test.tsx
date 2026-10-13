import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BottomNav } from './bottom-nav';
import { Sidebar } from './sidebar';
import { itemsFor, primaryItemsFor, titleForPath } from './nav-items';

describe('shell navigation', () => {
  it('shows mode-specific navigation and exactly five primary mobile items', () => {
    expect(itemsFor('REQUESTER').map(({ href }) => href)).toContain('/errands');
    expect(itemsFor('REQUESTER').map(({ href }) => href)).not.toContain('/marketplace');
    expect(itemsFor('RUNNER').map(({ href }) => href)).toContain('/marketplace');
    expect(itemsFor('RUNNER').map(({ href }) => href)).not.toContain('/errands');
    expect(primaryItemsFor('REQUESTER')).toHaveLength(5);
    expect(primaryItemsFor('RUNNER')).toHaveLength(5);
  });

  it.each([
    ['REQUESTER', ['Dashboard', 'My errands', 'Messages', 'Notifications', 'Profile & account']],
    ['RUNNER', ['Dashboard', 'Marketplace', 'Assignments', 'Messages', 'Profile & account']],
  ] as const)('renders the five-item mobile navigation for %s mode', (mode, labels) => {
    render(<BottomNav mode={mode} />);
    const navigation = screen.getByRole('navigation', { name: 'Main' });
    expect(within(navigation).getAllByRole('link')).toHaveLength(5);
    for (const label of labels) expect(within(navigation).getByText(label)).toBeInTheDocument();
  });

  it.each([
    ['REQUESTER', 'New errand', '/errands/new'],
    ['RUNNER', 'Find errands', '/marketplace'],
  ] as const)('renders the demo-matched desktop rail for %s mode', (mode, actionLabel, modeHref) => {
    render(<Sidebar mode={mode} name="Ada Lovelace" />);
    const sidebar = screen.getByRole('complementary', { name: 'Main' });
    expect(sidebar).toHaveClass('hidden', 'lg:flex');
    expect(within(sidebar).getByRole('link', { name: actionLabel })).toHaveAttribute('href', modeHref);
    expect(within(sidebar).getByRole('navigation', { name: 'Account' })).toBeInTheDocument();
    expect(within(sidebar).getByRole('link', { name: /Ada Lovelace/ })).toHaveAttribute('href', '/profile');
    if (mode === 'RUNNER') {
      expect(within(sidebar).getByRole('link', { name: 'Availability settings' })).toHaveAttribute('href', '/dashboard#availability');
    }
  });

  it('derives a stable breadcrumb for nested routes without displaying record ids', () => {
    expect(titleForPath('/settings/notifications')).toBe('Settings');
    expect(titleForPath('/errands/12345')).toBe('My errands');
    expect(titleForPath('/verification/attempt')).toBe('Verification');
  });
});
