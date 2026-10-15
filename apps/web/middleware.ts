import { decodeJwt } from 'jose';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ACCESS_COOKIE = 'ung_at';

/** Areas that need a session. Any other path is public, so unknown URLs reach the 404 page. */
const PROTECTED = [
  '/dashboard',
  '/errands',
  '/marketplace',
  '/offers',
  '/assignments',
  '/messages',
  '/notifications',
  '/profile',
  '/settings',
  '/ratings',
  '/runner',
  '/verification',
  '/disputes',
  '/report',
  '/reports',
  '/safety',
  '/pro',
  '/boosts',
  '/account',
  '/onboarding',
  '/policy-acceptance',
];
/** Auth pages: a signed-in user is sent to the app instead. */
const GUEST_ONLY = ['/login', '/register', '/forgot-password', '/reset-password'];

function matches(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function safeRedirect(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/dashboard';
  }

  try {
    const target = new URL(value, 'http://local.invalid');
    return target.origin === 'http://local.invalid' ? `${target.pathname}${target.search}${target.hash}` : '/dashboard';
  } catch {
    return '/dashboard';
  }
}

/** Decode only the expiry claim; the backend remains responsible for token verification and authorization. */
export function isAccessTokenValid(token: string | undefined): boolean {
  if (!token) return false;

  try {
    const { exp } = decodeJwt(token);
    return typeof exp === 'number' && exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function hasAccessCookie(request: NextRequest): boolean {
  return isAccessTokenValid(request.cookies.get(ACCESS_COOKIE)?.value);
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = hasAccessCookie(request);

  if (GUEST_ONLY.some((r) => matches(pathname, r))) {
    if (signedIn) {
      return NextResponse.redirect(new URL(safeRedirect(request.nextUrl.searchParams.get('redirect')), request.url));
    }
    return NextResponse.next();
  }

  if (PROTECTED.some((r) => matches(pathname, r)) && !signedIn) {
    // The refresh cookie is scoped to /api/v1/auth, so only the browser can use it.
    // /session tries one refresh and falls back to /login.
    const url = new URL('/session', request.url);
    url.searchParams.set('redirect', pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Skip Next internals, API proxy and static files (anything with an extension).
     */
    '/((?!_next/|api/|assets/|.*\\..*).*)',
  ],
};
