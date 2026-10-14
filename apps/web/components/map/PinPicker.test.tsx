import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MapProvider } from './MapProvider';
import { PinPicker, type PinValue } from './PinPicker';
import { classifyGeolocation, geolocationErrorStatus } from '@/lib/geolocation';

vi.mock('@/lib/google-maps', () => ({
  loadGoogleMaps: () => Promise.reject(new Error('Google Maps is not configured.')),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('geolocation states', () => {
  it('distinguishes a fresh position from one older than two minutes', () => {
    expect(classifyGeolocation(1000, 120_000)).toBe('available');
    expect(classifyGeolocation(1000, 121_001)).toBe('stale');
  });

  it('maps permission denial separately from unavailable errors', () => {
    expect(geolocationErrorStatus({ code: 1 })).toBe('denied');
    expect(geolocationErrorStatus({ code: 2 })).toBe('unavailable');
  });
});

describe('PinPicker fallback', () => {
  it('allows a manual pin and landmark after location permission is denied', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(value: PinValue) => void>();
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (_success: PositionCallback, failure: PositionErrorCallback) => {
          failure({ code: 1, message: 'Permission denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
        },
      } satisfies Geolocation,
    });

    render(
      <MapProvider>
        <PinPicker label="Pickup location" value={null} onChange={onChange} />
      </MapProvider>,
    );

    expect(await screen.findByText(/Map search is unavailable/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Use my location' }));
    expect(await screen.findByText(/Location access was denied/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Area or address'), 'Ikeja');
    await user.type(screen.getByLabelText('Nearby landmark'), 'Opposite the library');
    await user.type(screen.getByLabelText('Latitude'), '6.6018');
    await user.type(screen.getByLabelText('Longitude'), '3.3515');
    await user.click(screen.getByRole('button', { name: 'Set manual coordinates' }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({
      lat: 6.6018,
      lng: 3.3515,
      source: 'MANUAL',
      addressText: 'Ikeja',
      landmark: 'Opposite the library',
    }));
  });
});
