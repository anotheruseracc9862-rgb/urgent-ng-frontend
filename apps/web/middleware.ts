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

/** The access cookie is dropped by the browser when it expires, so presence is enough here. */
function hasAccessCookie(request: NextRequest): boolean {
  return Boolean(request.cookies.get(ACCESS_COOKIE)?.value);
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = hasAccessCookie(request);

  if (GUEST_ONLY.some((r) => matches(pathname, r))) {
    if (signedIn) {
      const target = request.nextUrl.searchParams.get('redirect');
      const safe = target && target.startsWith('/') && !target.startsWith('//') ? target : '/dashboard';
      return NextResponse.redirect(new URL(safe, request.url));
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
