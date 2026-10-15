import * as React from 'react';

/**
 * The page heading block used on every signed-in page (demo `.page-head`): a green eyebrow, the
 * title, a muted sentence, and the page's main actions on the right.
 */
export function PageHead({ eyebrow, title, description, actions, id }: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  id?: string;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 px-1.5 pt-1">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[.12em] text-green">{eyebrow}</p>
        ) : null}
        <h1 id={id} className="text-[clamp(24px,3vw,32px)] font-extrabold leading-[1.15] tracking-[-0.03em] text-ink">{title}</h1>
        {description ? <p className="mt-1.5 max-w-[620px] text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2.5">{actions}</div> : null}
    </header>
  );
}
