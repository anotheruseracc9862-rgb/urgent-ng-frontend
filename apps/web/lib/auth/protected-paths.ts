/**
 * Areas that need a session. Shared by the proxy and by the loading frame, so both agree on
 * which URLs belong to the signed-in app.
 */
export const PROTECTED_PATHS = [
  '/dashboard',
  '/errands',
  '/track',
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
  '/checkout',
  '/account',
  '/onboarding',
  '/policy-acceptance',
] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
