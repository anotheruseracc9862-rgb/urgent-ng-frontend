import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

export interface GoogleMapsLibraries {
  maps: google.maps.MapsLibrary;
  marker: google.maps.MarkerLibrary;
  places: google.maps.PlacesLibrary;
}

let librariesPromise: Promise<GoogleMapsLibraries> | undefined;

export function loadGoogleMaps(): Promise<GoogleMapsLibraries> {
  if (librariesPromise) return librariesPromise;

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.reject(new Error('Google Maps is not configured.'));

  setOptions({ key, v: 'weekly', language: 'en', region: 'NG', authReferrerPolicy: 'origin' });
  librariesPromise = Promise.all([
    importLibrary('maps'),
    importLibrary('marker'),
    importLibrary('places'),
  ]).then(([maps, marker, places]) => ({ maps, marker, places }));

  return librariesPromise;
}
