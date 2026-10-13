'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

type PolicyAcceptanceEvent = CustomEvent<{ redirect: string }>;
type ClientNavigationEvent = CustomEvent<{ href: string; replace: boolean }>;

export function PolicyAcceptanceNavigation() {
  const router = useRouter();

  useEffect(() => {
    const navigateToPolicies = (event: Event) => {
      const { redirect } = (event as PolicyAcceptanceEvent).detail;
      router.push(`/policy-acceptance?redirect=${encodeURIComponent(redirect)}`);
    };
    const navigate = (event: Event) => {
      const { href, replace } = (event as ClientNavigationEvent).detail;
      if (replace) router.replace(href);
      else router.push(href);
    };
    window.addEventListener('urgent:policy-acceptance-required', navigateToPolicies);
    window.addEventListener('urgent:auth-navigation', navigate);
    return () => {
      window.removeEventListener('urgent:policy-acceptance-required', navigateToPolicies);
      window.removeEventListener('urgent:auth-navigation', navigate);
    };
  }, [router]);

  return null;
}
