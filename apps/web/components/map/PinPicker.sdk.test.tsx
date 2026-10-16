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
  return {
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
  }),
}));
vi.mock('./PlaceSearch', () => ({ PlaceSearch: () => null }));

beforeEach(() => {
  fake.listeners.clear();
  fake.markerListeners.clear();
  fake.mapCenters.length = 0;
  fake.resetMapCount();
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
