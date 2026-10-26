'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const CONFIRM_MESSAGE = 'You have unsaved changes. Leave this page and discard them?';

export function useUnsavedChangesGuard(isDirty: boolean): void {
  const router = useRouter();

  useEffect(() => {
    if (!isDirty) return;

    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    const guardLinkNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest('a[href]');
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank' || link.hasAttribute('download')) return;

      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const next = `${destination.pathname}${destination.search}${destination.hash}`;
      if (current === next) return;

      event.preventDefault();
      event.stopPropagation();
      if (window.confirm(CONFIRM_MESSAGE)) router.push(next);
    };

    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', guardLinkNavigation, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', guardLinkNavigation, true);
    };
  }, [isDirty, router]);
}
