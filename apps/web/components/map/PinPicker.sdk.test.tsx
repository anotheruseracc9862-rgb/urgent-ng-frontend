import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MapProvider } from './MapProvider';
import { PinPicker, type PinValue } from './PinPicker';

const fake = vi.hoisted(() => {
  const listeners = new Map<string, (event?: unknown) => void>();
  const markerListeners = new Map<string, () => void>();
  let markerPosition = { lat: () => 6.6, lng: () => 3.5 };
  return {
    listeners,
    markerListeners,
    setMarkerPosition: (lat: number, lng: number) => { markerPosition = { lat: () => lat, lng: () => lng }; },
    getMarkerPosition: () => markerPosition,
  };
});

vi.mock('@/lib/google-maps', () => ({
  loadGoogleMaps: () => Promise.resolve({
    maps: {
      Map: class {
        addListener(name: string, handler: (event?: unknown) => void) { fake.listeners.set(name, handler); }
        setCenter() {}
      },
    },
    marker: {
      Marker: class {
        addListener(name: string, handler: () => void) { fake.markerListeners.set(name, handler); }
        getPosition() { return fake.getMarkerPosition(); }
        setPosition() {}
      },
    },
    places: {},
  }),
}));
vi.mock('./PlaceSearch', () => ({ PlaceSearch: () => null }));

beforeEach(() => {
  fake.listeners.clear();
  fake.markerListeners.clear();
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
});
