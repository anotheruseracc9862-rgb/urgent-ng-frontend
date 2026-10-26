import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MapProvider } from './MapProvider';
import { RadiusCircle } from './RadiusCircle';

const fake = vi.hoisted(() => {
  const mapCenters: Array<{ lat: number; lng: number }> = [];
  const circleCenters: Array<{ lat: number; lng: number }> = [];
  const fittedRadii: number[] = [];
  const radiusListeners = new Map<string, () => void>();
  let mapCount = 0;
  let radiusMeters = 5000;
  return {
    mapCenters,
    circleCenters,
    fittedRadii,
    radiusListeners,
    getMapCount: () => mapCount,
    getRadius: () => radiusMeters,
    reset: () => {
      mapCount = 0;
      radiusMeters = 5000;
      mapCenters.length = 0;
      circleCenters.length = 0;
      fittedRadii.length = 0;
      radiusListeners.clear();
    },
    incrementMapCount: () => { mapCount += 1; },
    setRadius: (radius: number) => { radiusMeters = radius; },
  };
});

vi.mock('@/lib/google-maps', () => ({
  loadGoogleMaps: () => Promise.resolve({
    maps: {
      Map: class {
        constructor(options: { center: { lat: number; lng: number } }) {
          fake.incrementMapCount();
          fake.mapCenters.push(options.center);
        }
        setCenter(center: { lat: number; lng: number }) { fake.mapCenters.push(center); }
        fitBounds(bounds: { radiusMeters: number }) { fake.fittedRadii.push(bounds.radiusMeters); }
      },
      Circle: class {
        constructor(options: { center: { lat: number; lng: number }; radius: number }) {
          fake.circleCenters.push(options.center);
          fake.setRadius(options.radius);
        }
        addListener(name: string, handler: () => void) {
          fake.radiusListeners.set(name, handler);
          return { remove: vi.fn() };
        }
        getRadius() { return fake.getRadius(); }
        getBounds() { return { radiusMeters: fake.getRadius() }; }
        setCenter(center: { lat: number; lng: number }) { fake.circleCenters.push(center); }
        setRadius(radius: number) { fake.setRadius(radius); }
        setMap() {}
      },
    },
  }),
}));

beforeEach(() => fake.reset());
afterEach(() => cleanup());

describe('RadiusCircle Google Maps lifecycle', () => {
  it('updates the map and radius without recreating the map when props change', async () => {
    const firstOnRadiusChange = vi.fn();
    const secondOnRadiusChange = vi.fn();
    const { rerender } = render(
      <MapProvider>
        <RadiusCircle center={{ lat: 6.5, lng: 3.4 }} radiusKm={5} onRadiusChange={firstOnRadiusChange} />
      </MapProvider>,
    );
    await screen.findByLabelText('Operating radius map');
    await waitFor(() => expect(fake.getMapCount()).toBe(1));
    expect(fake.fittedRadii.at(-1)).toBe(5000);

    rerender(
      <MapProvider>
        <RadiusCircle center={{ lat: 6.6, lng: 3.5 }} radiusKm={7} onRadiusChange={secondOnRadiusChange} />
      </MapProvider>,
    );
    await waitFor(() => expect(fake.getRadius()).toBe(7000));
    expect(fake.getMapCount()).toBe(1);
    expect(fake.mapCenters).toContainEqual({ lat: 6.6, lng: 3.5 });
    expect(fake.circleCenters).toContainEqual({ lat: 6.6, lng: 3.5 });
    expect(fake.fittedRadii.at(-1)).toBe(7000);

    act(() => fake.radiusListeners.get('dragend')?.());
    expect(secondOnRadiusChange).toHaveBeenCalledWith(7);
    expect(firstOnRadiusChange).not.toHaveBeenCalled();
  });
});
