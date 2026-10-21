import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MapProvider } from './MapProvider';
import { PinPicker, type PinValue } from './PinPicker';

const fake = vi.hoisted(() => {
  const listeners = new Map<string, (event?: unknown) => void>();
  const markerListeners = new Map<string, () => void>();
  const mapCenters: Array<{ lat: number; lng: number }> = [];
  let mapCount = 0;
  let markerPosition = { lat: () => 6.6, lng: () => 3.5 };
  // Each address lookup waits here until the test answers it, in any order.
  const lookups: Array<{ location: { lat: number; lng: number }; resolve: (address: string | null) => void; reject: () => void }> = [];
  return {
    lookups,
    listeners,
    markerListeners,
    mapCenters,
    getMapCount: () => mapCount,
    resetMapCount: () => { mapCount = 0; },
    setMarkerPosition: (lat: number, lng: number) => { markerPosition = { lat: () => lat, lng: () => lng }; },
    getMarkerPosition: () => markerPosition,
    recordMapCenter: (center: { lat: number; lng: number }) => mapCenters.push(center),
    incrementMapCount: () => { mapCount += 1; },
  };
});

vi.mock('@/lib/google-maps', () => ({
  loadGoogleMaps: () => Promise.resolve({
    maps: {
      Map: class {
        constructor() { fake.incrementMapCount(); }
        addListener(name: string, handler: (event?: unknown) => void) {
          fake.listeners.set(name, handler);
          return { remove: vi.fn() };
        }
        setCenter(center: { lat: number; lng: number }) { fake.recordMapCenter(center); }
      },
    },
    marker: {
      Marker: class {
        addListener(name: string, handler: () => void) {
          fake.markerListeners.set(name, handler);
          return { remove: vi.fn() };
        }
        getPosition() { return fake.getMarkerPosition(); }
        setPosition() {}
        setMap() {}
      },
    },
    places: {},
    geocoding: {
      Geocoder: class {
        geocode({ location }: { location: { lat: number; lng: number } }) {
          return new Promise((resolve, reject) => {
            fake.lookups.push({
              location,
              resolve: (address) => resolve({ results: address ? [{ formatted_address: address }] : [] }),
              reject: () => reject(new Error('REQUEST_DENIED')),
            });
          });
        }
      },
    },
  }),
}));
vi.mock('./PlaceSearch', () => ({
  PlaceSearch: ({ text }: { text?: string }) => <input aria-label="Search box" readOnly value={text ?? ''} />,
}));

beforeEach(() => {
  fake.listeners.clear();
  fake.markerListeners.clear();
  fake.mapCenters.length = 0;
  fake.resetMapCount();
  fake.lookups.length = 0;
  vi.stubGlobal('google', { maps: { SymbolPath: { CIRCLE: 0 } } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('PinPicker with the Google Maps SDK', () => {
  it('reports a clicked point and a dragged marker as map pins', async () => {
    const onChange = vi.fn<(value: PinValue) => void>();
    render(
      <MapProvider>
        <PinPicker label="Pickup" value={null} onChange={onChange} />
      </MapProvider>,
    );
    await screen.findByRole('application', { name: 'Pickup map' });
    await waitFor(() => expect(fake.listeners.has('click')).toBe(true));

    act(() => fake.listeners.get('click')!({ latLng: { lat: () => 6.52, lng: () => 3.38 } }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ lat: 6.52, lng: 3.38, source: 'MAP_PIN' }));

    fake.setMarkerPosition(6.61, 3.51);
    act(() => fake.markerListeners.get('dragend')!());
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ lat: 6.61, lng: 3.51, source: 'MAP_PIN' }));
  });

  describe('the address of a pin', () => {
    const open = async (onChange: (value: PinValue) => void, value: PinValue | null = null) => {
      render(<MapProvider><PinPicker label="Service address" value={value} onChange={onChange} /></MapProvider>);
      await screen.findByRole('application', { name: 'Service address map' });
      await waitFor(() => expect(fake.listeners.has('click')).toBe(true));
    };
    const clickMap = (lat: number, lng: number) => act(() => fake.listeners.get('click')!({ latLng: { lat: () => lat, lng: () => lng } }));

    it('shows the street address of a clicked point in the search box and reports it with the pin', async () => {
      const onChange = vi.fn<(value: PinValue) => void>();
      await open(onChange);
      clickMap(6.52, 3.38);
      expect(fake.lookups).toHaveLength(1);
      expect(fake.lookups[0].location).toEqual({ lat: 6.52, lng: 3.38 });

      await act(async () => fake.lookups[0].resolve('12 Admiralty Way, Lekki Phase 1, Lagos'));

      expect(screen.getByLabelText('Search box')).toHaveValue('12 Admiralty Way, Lekki Phase 1, Lagos');
      expect(onChange).toHaveBeenLastCalledWith({ lat: 6.52, lng: 3.38, source: 'MAP_PIN', addressText: '12 Admiralty Way, Lekki Phase 1, Lagos' });
    });

    it('looks up a dragged marker too', async () => {
      const onChange = vi.fn<(value: PinValue) => void>();
      await open(onChange);
      fake.setMarkerPosition(6.61, 3.51);
      act(() => fake.markerListeners.get('dragend')!());
      await act(async () => fake.lookups[0].resolve('Allen Avenue, Ikeja'));
      expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ lat: 6.61, lng: 3.51, addressText: 'Allen Avenue, Ikeja' }));
    });

    it('ignores an answer for a pin that has since been moved', async () => {
      const onChange = vi.fn<(value: PinValue) => void>();
      await open(onChange);
      clickMap(6.52, 3.38);
      clickMap(6.7, 3.6);
      await act(async () => fake.lookups[1].resolve('The newer place'));
      await act(async () => fake.lookups[0].resolve('The older place'));

      expect(screen.getByLabelText('Search box')).toHaveValue('The newer place');
      expect(onChange).not.toHaveBeenCalledWith(expect.objectContaining({ addressText: 'The older place' }));
    });

    it('clears the earlier address while the new one is looked up, rather than leave a wrong one', async () => {
      const onChange = vi.fn<(value: PinValue) => void>();
      await open(onChange, { lat: 6.5, lng: 3.4, source: 'GEOCODED_ADDRESS', addressText: 'Old address' });
      expect(screen.getByLabelText('Search box')).toHaveValue('Old address');
      clickMap(6.8, 3.7);
      expect(screen.getByLabelText('Search box')).toHaveValue('');
      expect(onChange).toHaveBeenLastCalledWith({ lat: 6.8, lng: 3.7, source: 'MAP_PIN' });
    });

    it('stops asking for addresses once Google refuses, and still places every pin', async () => {
      const onChange = vi.fn<(value: PinValue) => void>();
      await open(onChange);
      clickMap(6.52, 3.38);
      await act(async () => fake.lookups[0].reject());
      clickMap(6.6, 3.5);

      expect(fake.lookups).toHaveLength(1);
      expect(onChange).toHaveBeenLastCalledWith({ lat: 6.6, lng: 3.5, source: 'MAP_PIN' });
    });

    it('keeps the pin and says nothing when no address is found or the lookup fails', async () => {
      const onChange = vi.fn<(value: PinValue) => void>();
      await open(onChange);
      clickMap(6.52, 3.38);
      await act(async () => fake.lookups[0].resolve(null));
      clickMap(6.53, 3.39);
      await act(async () => fake.lookups[1].reject());

      expect(onChange).toHaveBeenCalledTimes(2);
      expect(screen.getByLabelText('Search box')).toHaveValue('');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('keeps the Google map instance when values and callbacks change', async () => {
    const firstOnChange = vi.fn<(value: PinValue) => void>();
    const secondOnChange = vi.fn<(value: PinValue) => void>();
    const { rerender } = render(
      <MapProvider>
        <PinPicker label="Pickup" value={null} onChange={firstOnChange} />
      </MapProvider>,
    );
    await screen.findByRole('application', { name: 'Pickup map' });
    await waitFor(() => expect(fake.getMapCount()).toBe(1));

    rerender(
      <MapProvider>
        <PinPicker label="Pickup" value={{ lat: 6.52, lng: 3.38, source: 'MAP_PIN' }} onChange={secondOnChange} />
      </MapProvider>,
    );
    await waitFor(() => expect(fake.mapCenters).toContainEqual({ lat: 6.52, lng: 3.38 }));
    expect(fake.getMapCount()).toBe(1);

    act(() => fake.listeners.get('click')!({ latLng: { lat: () => 6.6, lng: () => 3.4 } }));
    expect(secondOnChange).toHaveBeenCalledWith(expect.objectContaining({ lat: 6.6, lng: 3.4 }));
    expect(firstOnChange).not.toHaveBeenCalled();
  });
});
