import { Skeleton } from '@urgent/ui';

/**
 * Shown inside the signed-in shell while a page is being prepared, so the sidebar and top bar stay.
 * Only a few card-shaped placeholders: the page's own heading appears with the page.
 */
export default function BusinessLoading() {
  return (
    <div aria-busy="true" aria-label="Loading page" className="grid content-start gap-4">
      <Skeleton className="h-40 rounded-[var(--r-lg)]" />
      <Skeleton className="h-40 rounded-[var(--r-lg)]" />
    </div>
  );
}
