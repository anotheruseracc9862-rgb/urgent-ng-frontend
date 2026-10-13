import Link from 'next/link';

/** Centered status card for 404 and expired links (demo `.state-card`). */
export function StateCard({
  code,
  title,
  children,
  actions,
}: {
  code?: string;
  title: string;
  children: React.ReactNode;
  actions?: { href: string; label: string; primary?: boolean }[];
}) {
  return (
    <div className="grid min-h-[56vh] flex-1 place-items-center px-4 py-12">
      <div className="w-full max-w-[520px] rounded-[var(--r-xl)] bg-surface p-[clamp(28px,5vw,48px)] text-center shadow-[var(--shadow)]">
        {code ? (
          <div className="bg-gradient-to-br from-green to-lime bg-clip-text text-[clamp(64px,14vw,104px)] font-extrabold leading-none tracking-[-0.06em] text-transparent">
            {code}
          </div>
        ) : null}
        <h1 className="mb-2 mt-3 text-[26px] font-extrabold tracking-[-0.02em]">{title}</h1>
        <div className="text-muted">{children}</div>
        {actions?.length ? (
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            {actions.map((a) => (
              <Link
                key={a.href + a.label}
                href={a.href}
                className={
                  a.primary
                    ? 'inline-flex min-h-[44px] items-center rounded-full bg-lime px-5 text-[13.5px] font-bold text-ink transition-colors hover:bg-lime-600'
                    : 'inline-flex min-h-[44px] items-center rounded-full bg-surface px-5 text-[13.5px] font-bold shadow-[inset_0_0_0_1px_var(--line)] transition-colors hover:bg-panel'
                }
              >
                {a.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
