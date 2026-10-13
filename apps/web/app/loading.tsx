import { Skeleton } from '@urgent/ui';

export default function Loading() {
  return (
    <main aria-label="Loading page" className="mx-auto grid w-full max-w-6xl gap-4 p-4 sm:p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full rounded-[var(--r-lg)]" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-28 w-full rounded-[var(--r-lg)]" />
        <Skeleton className="h-28 w-full rounded-[var(--r-lg)]" />
        <Skeleton className="h-28 w-full rounded-[var(--r-lg)]" />
      </div>
    </main>
  );
}
