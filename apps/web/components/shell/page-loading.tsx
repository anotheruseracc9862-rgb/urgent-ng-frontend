import * as React from 'react';
import { Skeleton } from '@urgent/ui';
import { PageHead } from './page-head';

/**
 * A page that is waiting for its data. The heading is real, so the page is recognisable at once.
 * Only the cards are placeholders. Use it where the whole page body depends on one record.
 */
export function PageLoading({
  title,
  eyebrow,
  description,
  cards = [160, 240],
  width = 'max-w-5xl',
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  /** Heights, in pixels, of the placeholder cards. */
  cards?: number[];
  width?: string;
}) {
  return (
    <div className={`mx-auto grid ${width} content-start gap-4`} aria-busy="true">
      <PageHead title={title} eyebrow={eyebrow} description={description} />
      {cards.map((height, index) => (
        <Skeleton key={index} className="rounded-[var(--r-lg)]" style={{ height }} aria-label="Loading" />
      ))}
    </div>
  );
}
