import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { ModeNudge } from './mode-nudge';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

const me = (patch: Partial<Me> = {}) => ({ id: 'u1', startMode: 'REQUESTER', ...patch }) as unknown as Me;

const renderNudge = (user: Me, mode: 'REQUESTER' | 'RUNNER' = 'REQUESTER') =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SessionProvider me={user}><ModeNudge mode={mode} /></SessionProvider>
    </QueryClientProvider>,
  );

const modeCookie = () => /ung_mode=(\w+)/.exec(document.cookie)?.[1];

beforeEach(() => {
  push.mockReset();
  localStorage.clear();
  document.cookie = 'ung_mode=; path=/; max-age=0';
});
afterEach(cleanup);

describe('switching to runner mode', () => {
  it('explains runner mode first and changes nothing until confirmed', () => {
    renderNudge(me());
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Runner mode' }));
    expect(screen.getByText('Ready to run?')).toBeTruthy();
    expect(modeCookie()).toBeUndefined();
    expect(push).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Stay as requester' }));
    expect(modeCookie()).toBeUndefined();
    expect(push).not.toHaveBeenCalled();
  });

  it('switches after confirmation and does not ask again', () => {
    const first = renderNudge(me());
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Runner mode' }));
    fireEvent.click(screen.getByRole('button', { name: "Let's run" }));
    expect(modeCookie()).toBe('RUNNER');
    expect(push).toHaveBeenCalledWith('/dashboard');
    first.unmount();

    document.cookie = 'ung_mode=; path=/; max-age=0';
    renderNudge(me());
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Runner mode' }));
    expect(screen.queryByText('Ready to run?')).toBeNull();
    expect(modeCookie()).toBe('RUNNER');
  });

  it('skips the intro for someone who chose runner when signing up', () => {
    renderNudge(me({ startMode: 'RUNNER' }));
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Runner mode' }));
    expect(screen.queryByText('Ready to run?')).toBeNull();
    expect(modeCookie()).toBe('RUNNER');
  });

  it('shows the requester intro to someone who signed up as a runner, once', () => {
    renderNudge(me({ startMode: 'RUNNER' }), 'RUNNER');
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Requester mode' }));
    expect(screen.getByRole('heading', { name: 'Need something done?' })).toBeTruthy();
    expect(modeCookie()).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Post an errand' }));
    expect(modeCookie()).toBe('REQUESTER');
  });

  it('switching to the mode that was signed up for is immediate', () => {
    renderNudge(me(), 'RUNNER');
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Requester mode' }));
    expect(screen.queryByRole('heading', { name: 'Need something done?' })).toBeNull();
    expect(modeCookie()).toBe('REQUESTER');
  });
});
