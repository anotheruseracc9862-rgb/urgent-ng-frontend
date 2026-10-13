import type { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import type { UserStatus } from '@/lib/api/types';

/**
 * Decides where a signed-in person lands (Frontend Build Plan F1-04, F1-07):
 * restricted accounts see their standing, brand-new accounts choose a mode, others go on.
 */
export async function routeAfterLogin(
  router: ReturnType<typeof useRouter>,
  status: UserStatus,
  redirect: string,
  isNewAccount = false,
) {
  if (status !== 'ACTIVE') {
    router.replace('/account/standing');
    router.refresh();
    return;
  }

  let needsOnboarding = isNewAccount;
  try {
    const me = await authApi.me();
    needsOnboarding = needsOnboarding || me.startMode === null;
  } catch {
    // Fall through to the destination; the shell will re-check the session.
  }

  router.replace(needsOnboarding ? '/onboarding' : redirect);
  router.refresh();
}
