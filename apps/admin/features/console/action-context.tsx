"use client";

import { valueAt } from "./access";

const naira = (kobo: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(kobo / 100);
const lagos = (iso: string) => new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }).format(new Date(iso));
const placeholders = (text: string) => [...text.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map(match => match[1]);

/** Template text is rendered as plain text; placeholders are marked, never interpreted as markup. */
function TemplateText({ text }: { text: string }) {
  return <>{text.split(/(\{[a-zA-Z0-9_]+\})/).map((part, index) => /^\{.+\}$/.test(part) ? <mark key={index}>{part.slice(1, -1)}</mark> : <span key={index}>{part}</span>)}</>;
}

function PriceContext({ record, values }: { record: unknown; values: Record<string, unknown> }) {
  const current = valueAt(record, "currentPriceKobo");
  const upcoming = (valueAt(record, "upcoming") as { amountKobo: number; effectiveFrom: string }[] | undefined) ?? [];
  const proposed = values.amountKobo === undefined || values.amountKobo === "" ? undefined : Number(values.amountKobo);
  const start = typeof values.effectiveFrom === "string" && values.effectiveFrom ? new Date(values.effectiveFrom) : undefined;
  return <div className="action-context stack" aria-live="polite">
    <p className="context-note">Amounts are entered in kobo (100 kobo = ₦1), VAT inclusive. Zero makes the product free.</p>
    <dl className="record-fields">
      <div><dt>Current price</dt><dd>{typeof current === "number" ? naira(current) : "No price set"}</dd></div>
      {upcoming.map(item => <div key={item.effectiveFrom}><dt>Already scheduled</dt><dd>{naira(item.amountKobo)} from {lagos(item.effectiveFrom)} (WAT)</dd></div>)}
      <div><dt>Proposed price</dt><dd>{proposed !== undefined && Number.isInteger(proposed) && proposed >= 0 ? <>{naira(proposed)}{typeof current === "number" && current !== proposed && <> ({proposed > current ? "+" : "−"}{naira(Math.abs(proposed - current))})</>}</> : "Enter a whole number of kobo"}</dd></div>
      <div><dt>Starts</dt><dd>{start && !Number.isNaN(start.getTime()) ? `${lagos(start.toISOString())} (WAT)` : "About a minute after the request is submitted"}</dd></div>
    </dl>
    <p className="notice">This creates an approval request. The price does not change until a different administrator approves it.</p>
  </div>;
}

function TemplateContext({ record, values, reset }: { record: unknown; values: Record<string, unknown>; reset: boolean }) {
  const allowed = (valueAt(record, "placeholders") as string[] | undefined) ?? [];
  if (reset) return <div className="action-context stack"><p className="context-note">Removes the override and goes back to the built-in copy below.</p>
    <p><b><TemplateText text={String(valueAt(record, "defaultTitle") ?? "")} /></b></p><p><TemplateText text={String(valueAt(record, "defaultBody") ?? "")} /></p></div>;
  const title = String(values.title ?? ""), body = String(values.body ?? "");
  const unknown = [...new Set(placeholders(`${title} ${body}`).filter(name => !allowed.includes(name)))];
  return <div className="action-context stack" aria-live="polite">
    <p className="context-note">Allowed placeholders: {allowed.length ? allowed.map(name => `{${name}}`).join(", ") : "none"}. Other placeholders are rejected.</p>
    {unknown.length > 0 && <p className="error" role="alert">Unknown placeholder: {unknown.map(name => `{${name}}`).join(", ")}. The server will refuse this template.</p>}
    <section className="template-preview" aria-label="Notification preview"><small>Preview · placeholders are highlighted and filled with real values when sent</small><p><b><TemplateText text={title} /></b></p><p className="preserve-lines"><TemplateText text={body} /></p></section>
    {values.active === false && <p className="notice">This template is switched off. Staff and users will receive the built-in copy or nothing, according to its category.</p>}
  </div>;
}

/** Plain-language consequences shown above generated form fields for the highest-impact settings. */
export function ActionContext({ path, method, record, values }: { path: string; method: string; record: unknown; values: Record<string, unknown> }) {
  if (/^\/pricing\/products\/\{id\}\/prices$/.test(path)) return <PriceContext record={record} values={values} />;
  if (/^\/notification-templates\/\{key\}$/.test(path)) return <TemplateContext record={record} values={values} reset={method === "DELETE"} />;
  if (path === "/policies") return <div className="action-context stack">
    <p className="notice">Publishing records a new database version. It does not change the static Terms or Privacy pages on the website.</p>
    <p className="context-note">{values.requiresReacceptance ? "Users must accept this version before their next action." : "Users are not asked to accept again."} Use only lawyer-approved wording and a document reference that already exists.</p>
  </div>;
  return null;
}
