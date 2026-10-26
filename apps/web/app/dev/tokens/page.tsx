import { notFound } from "next/navigation";
import { designTokens } from "@urgent/ui";

export const metadata = { title: "Design tokens — Urgent.ng" };
export const dynamic = "force-dynamic";

export default function DesignTokensPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="min-h-screen bg-bg px-4 py-8 text-ink sm:px-8">
      <div className="mx-auto grid max-w-6xl gap-8">
        <header>
          <p className="text-xs font-extrabold uppercase tracking-[.12em] text-green">
            Urgent.ng business UI
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-.03em]">
            Design tokens
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Light-theme foundations ported from the signed-in UI demo. Public
            landing pages retain the separate CN palette.
          </p>
        </header>

        <section aria-labelledby="palette-heading" className="grid gap-4">
          <div>
            <h2 id="palette-heading" className="text-xl font-bold">Color palette</h2>
            <p className="mt-1 text-sm text-muted">Business palette from demo/ui.css.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {designTokens.colors.map((color) => (
              <article
                key={color.token}
                className="overflow-hidden rounded-[var(--r-lg)] bg-surface shadow-[var(--shadow)]"
              >
                <div
                  aria-hidden="true"
                  className="h-16 border-b border-line"
                  style={{ backgroundColor: color.value }}
                />
                <div className="grid gap-1 p-3">
                  <h3 className="text-sm font-bold">{color.name}</h3>
                  <code className="text-xs text-muted">{color.value}</code>
                  <code className="truncate text-[11px] text-faint">{color.token}</code>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="type-heading" className="grid gap-4">
          <div>
            <h2 id="type-heading" className="text-xl font-bold">Typography</h2>
            <p className="mt-1 text-sm text-muted">Plus Jakarta Sans, weights 400–800.</p>
          </div>
          <div className="grid gap-3">
            {designTokens.typography.map((style) => (
              <article
                key={style.name}
                className="grid gap-2 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:grid-cols-[150px_1fr]"
              >
                <div className="grid content-start">
                  <h3 className="text-sm font-bold">{style.name}</h3>
                  <span className="text-xs text-muted">{style.size}</span>
                </div>
                <p
                  style={{
                    fontSize: style.previewSize,
                    fontWeight: style.weight,
                    lineHeight: style.lineHeight,
                  }}
                >
                  Urgent.ng gets it done.
                </p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="radius-heading" className="grid gap-4">
          <div>
            <h2 id="radius-heading" className="text-xl font-bold">Radii and spacing</h2>
            <p className="mt-1 text-sm text-muted">28px containers, 22px cards, pill controls and a 4px spacing base.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {designTokens.radii.map((radius) => (
              <article key={radius.token} className="rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)]">
                <div
                  aria-hidden="true"
                  className="grid h-20 place-items-center bg-tint text-sm font-bold text-green-900"
                  style={{ borderRadius: radius.value }}
                >
                  {radius.value}
                </div>
                <h3 className="mt-3 text-sm font-bold">{radius.name}</h3>
                <code className="text-xs text-muted">{radius.token}</code>
              </article>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)]">
            {designTokens.spacing.map((item) => (
              <span
                key={item.name}
                className="rounded-full bg-panel px-3 py-2 text-sm"
                title={item.value}
              >
                <b>{item.name}:</b> {item.value}
              </span>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
