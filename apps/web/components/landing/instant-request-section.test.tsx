import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readErrandDraft } from '@/lib/drafts/errand-draft';
import { InstantRequestSection } from './instant-request-section';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const categories = [
  { key: 'delivery', name: 'Delivery', requiresPickup: true, requiresDestination: true, flow: 'TRANSIT' as const, isPopular: true },
  { key: 'car_wash', name: 'Car Wash', requiresPickup: false, requiresDestination: true, flow: 'SERVICE' as const, isPopular: true },
];

beforeEach(() => sessionStorage.clear());
afterEach(() => { cleanup(); push.mockClear(); });

const fill = (label: RegExp | string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('Instant request form', () => {
  it('asks for a pickup and a delivery destination for a delivery', () => {
    render(<InstantRequestSection categories={categories} />);
    expect(screen.getByLabelText(/Pickup Location/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Delivery Destination/)).toBeInTheDocument();
  });

  it('asks for one service address for a service, and hands it over with no pickup', () => {
    render(<InstantRequestSection categories={categories} />);
    fireEvent.change(screen.getByLabelText(/Errand Category/), { target: { value: 'car_wash' } });
    expect(screen.queryByLabelText(/Pickup Location/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Delivery Destination/)).not.toBeInTheDocument();

    fill(/What needs to be done/, 'Wash my car this afternoon');
    fill(/Service Address/, 'Admiralty Way, Lekki');
    fireEvent.click(screen.getByRole('button', { name: /Broadcast Errand to Runners/ }));

    expect(push).toHaveBeenCalledWith('/register');
    expect(readErrandDraft()).toMatchObject({ category: 'car_wash', pickup: '', destination: 'Admiralty Way, Lekki' });
  });

  it('still refuses a service with no address', () => {
    render(<InstantRequestSection categories={categories} />);
    fireEvent.change(screen.getByLabelText(/Errand Category/), { target: { value: 'car_wash' } });
    fill(/What needs to be done/, 'Wash my car this afternoon');
    fireEvent.click(screen.getByRole('button', { name: /Broadcast Errand to Runners/ }));
    expect(screen.getByText('Add the service address')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
