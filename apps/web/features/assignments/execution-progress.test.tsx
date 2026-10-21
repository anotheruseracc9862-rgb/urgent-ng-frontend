import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ExecutionProgress, RouteBlock, executionStage, stageBadge } from './execution-progress';

afterEach(cleanup);

describe('executionStage', () => {
  it('puts every running status on one of the five milestones', () => {
    expect(['ACCEPTED', 'IN_PROGRESS', 'PICKED_UP', 'DELIVERED', 'COMPLETED'].map(executionStage)).toEqual([0, 1, 2, 3, 4]);
    expect(executionStage('RUNNER_SELECTED')).toBe(-1);
  });
});

describe('stageBadge', () => {
  it('names the milestone in the words of the flow', () => {
    expect(stageBadge('PICKED_UP', false).label).toBe('Picked up');
    expect(stageBadge('PICKED_UP', false, 'SERVICE').label).toBe('Working');
    expect(stageBadge('DELIVERED', false, { flow: 'SERVICE' }).label).toBe('Finished');
    expect(stageBadge('COMPLETED', false, 'SERVICE').label).toBe('Done');
    expect(stageBadge('RUNNER_SELECTED', true, 'SERVICE').label).toBe('Waiting for your answer');
  });
});

describe('ExecutionProgress', () => {
  it('lists the delivery milestones by default and the service ones for a service', () => {
    const { rerender } = render(<ExecutionProgress errandStatus="IN_PROGRESS" />);
    expect(screen.getByRole('list', { name: 'Errand progress' })).toHaveTextContent('Picked up');
    rerender(<ExecutionProgress errandStatus="IN_PROGRESS" flow="SERVICE" />);
    const list = screen.getByRole('list', { name: 'Errand progress' });
    expect(list).toHaveTextContent('Working');
    expect(list).not.toHaveTextContent('Picked up');
    expect(screen.getByText('On the way').closest('li')).toHaveAttribute('aria-current', 'step');
  });
});

describe('RouteBlock', () => {
  it('shows pickup and drop-off for a delivery', () => {
    render(<RouteBlock from="Yaba" to="Ikeja" />);
    expect(screen.getByText('Yaba')).toBeInTheDocument();
    expect(screen.getByText('Ikeja')).toBeInTheDocument();
    expect(screen.getByText('Pickup:')).toBeInTheDocument();
  });

  it('shows one service address, never a pickup placeholder', () => {
    render(<RouteBlock flow="SERVICE" from={null} to="Lekki Phase 1" />);
    expect(screen.getByText('Lekki Phase 1')).toBeInTheDocument();
    expect(screen.getByText('Service address:')).toBeInTheDocument();
    expect(screen.queryByText(/Pickup/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Drop-off/)).not.toBeInTheDocument();
  });
});
