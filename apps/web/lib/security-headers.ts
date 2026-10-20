export interface SecurityHeader {
  key: string;
  value: string;
}

interface Options {
  production: boolean;
  /** Origin of the backend API, used when the browser calls it directly. */
  apiOrigin?: string;
  /**
   * Headers for the push service worker file. A worker takes its policy from its own response, and
   * the Firebase worker loads its code from Google's CDN, so it needs that one extra script source.
   * The pages do not.
   */
  serviceWorker?: boolean;
}

/** Third parties the app uses: Google sign-in, Google Maps, Firebase Messaging. Nothing else. */
const GOOGLE_SCRIPT = ['https://accounts.google.com', 'https://maps.googleapis.com'];
const GOOGLE_CONNECT = ['https://accounts.google.com', 'https://*.googleapis.com'];
const FIREBASE_WORKER_SCRIPT = ['https://www.gstatic.com'];

function originOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function contentSecurityPolicy({ production, apiOrigin, serviceWorker = false }: Options): string {
  const api = originOf(apiOrigin);
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    // Next.js inlines its bootstrap scripts, so static pages cannot carry a per-request nonce.
    'script-src': ["'self'", "'unsafe-inline'", ...(production ? [] : ["'unsafe-eval'"]), ...GOOGLE_SCRIPT, ...(serviceWorker ? FIREBASE_WORKER_SCRIPT : [])],
    'style-src': ["'self'", "'unsafe-inline'", 'https://accounts.google.com'],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", ...(api ? [api] : []), ...GOOGLE_CONNECT, ...(production ? [] : ['ws:', 'http://127.0.0.1:*', 'http://localhost:*'])],
    'frame-src': ['https://accounts.google.com'],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };
  return Object.entries(directives).map(([name, values]) => `${name} ${values.join(' ')}`).join('; ');
}

export function securityHeaders(options: Options): SecurityHeader[] {
  return [
    { key: 'Content-Security-Policy', value: contentSecurityPolicy(options) },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(self), microphone=(), payment=(), usb=()' },
    ...(options.production
      ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
      : []),
  ];
}
