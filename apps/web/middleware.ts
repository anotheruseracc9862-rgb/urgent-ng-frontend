import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

const publicRoutes = ['/', '/login', '/register', '/verify', '/forgot-password', '/reset-password', '/terms', '/privacy', '/help', '/pricing'];
const authRoutes = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith('/api/'));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));
  
  const accessToken = request.cookies.get('access_token')?.value;
  
  // Decode token to check session
  let session = null;
  if (accessToken) {
    try {
      session = jose.decodeJwt(accessToken);
    } catch {
      // Invalid token
    }
  }
  
  // Redirect authenticated users away from auth pages
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // Redirect unauthenticated users to login
  if (!isPublicRoute && !session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
