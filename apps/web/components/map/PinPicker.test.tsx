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
    expect(geolocationErrorStatus({ code: 3 })).toBe('timeout');
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

describe('Use my location', () => {
  const error = (code: number) => ({ code, message: 'x', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
  const position = (accuracy: number) => ({ coords: { latitude: 6.5, longitude: 3.4, accuracy }, timestamp: Date.now() }) as GeolocationPosition;
  const mockGeolocation = (getCurrentPosition: Geolocation['getCurrentPosition']) =>
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } satisfies Partial<Geolocation> });
  const renderPicker = (onChange = vi.fn<(value: PinValue) => void>()) => {
    render(<MapProvider><PinPicker label="Service address" value={null} onChange={onChange} /></MapProvider>);
    return onChange;
  };

  it('shows that it is working while the phone looks for a position, and disables the button', async () => {
    const user = userEvent.setup();
    mockGeolocation(() => undefined);
    renderPicker();
    await user.click(await screen.findByRole('button', { name: 'Use my location' }));
    const busy = await screen.findByRole('button', { name: /Finding your location/ });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText(/If your phone asks, choose Allow/)).toBeInTheDocument();
  });

  it('asks again for a coarse fix when the precise one fails, as on a phone set to share an approximate location', async () => {
    const user = userEvent.setup();
    const attempts: PositionOptions[] = [];
    const onChange = vi.fn<(value: PinValue) => void>();
    mockGeolocation((success, failure, options) => {
      attempts.push(options ?? {});
      if (attempts.length === 1) failure?.(error(2));
      else success(position(4200));
    });
    renderPicker(onChange);
    await user.click(await screen.findByRole('button', { name: 'Use my location' }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ lat: 6.5, lng: 3.4, source: 'BROWSER_GPS' })));
    expect(attempts).toHaveLength(2);
    expect(attempts[0]).toMatchObject({ enableHighAccuracy: true });
    expect(attempts[1]).toMatchObject({ enableHighAccuracy: false });
    expect(await screen.findByText(/Approximate location found \(within about 4 km\)\. Drag the pin/)).toBeInTheDocument();
  });

  it('does not ask a second time after a denial', async () => {
    const user = userEvent.setup();
    const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>((_success, failure) => failure?.(error(1)));
    mockGeolocation(getCurrentPosition);
    renderPicker();
    await user.click(await screen.findByRole('button', { name: 'Use my location' }));
    expect(await screen.findByText(/Location access was denied/)).toBeInTheDocument();
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('says it took too long, not that location is unavailable, after two timeouts', async () => {
    const user = userEvent.setup();
    mockGeolocation((_success, failure) => failure?.(error(3)));
    renderPicker();
    await user.click(await screen.findByRole('button', { name: 'Use my location' }));
    expect(await screen.findByText(/took too long/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use my location' })).toBeEnabled();
  });
});
