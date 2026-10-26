"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldAlert, Inbox, LockKeyhole } from "lucide-react";
import { ApiError, type ApiMeta } from "@urgent/api-client";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@urgent/ui";
import { adminErrorMessage } from "@/lib/api/client";
import { labelFor, valueAt } from "./access";

export function AccessDenied() {
  return <section className="empty-state"><ShieldAlert size={32} /><h1>Access restricted</h1><p>Your account does not have permission to open this workspace. Ask an administrator if you need access.</p><Link className="button" href="/dashboard">Back to overview</Link></section>;
}
export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  const title = error instanceof ApiError && error.status === 403 ? "Permission denied" : error instanceof ApiError && error.status === 404 ? "Record not found" : "Could not load this data";
  return <div className="error-state" role="alert"><ShieldAlert size={20} /><div><b>{title}</b><p>{adminErrorMessage(error)}</p>{error instanceof ApiError && error.fieldMessages.length > 0 && <ul>{error.fieldMessages.map(f => <li key={f}>{f}</li>)}</ul>}{retry && <button className="button" onClick={retry}>Retry</button>}</div></div>;
}
export function LoadingState() {
  return <div className="loading-state" role="status" aria-label="Loading records">{[1, 2, 3, 4].map(n => <div key={n} />)}</div>;
}
export function EmptyState() {
  return <div className="empty-state"><Inbox size={30} /><h2>No records found</h2><p>Try another filter, clear your search, or return when new records are available.</p></div>;
}
export function StatusBadge({ value }: { value: string | boolean }) {
  const text = typeof value === "boolean" ? value ? "Yes" : "No" : labelFor(value);
  const type = /^(ACTIVE|APPROVED|COMPLETED|PROCESSED|PUBLISHED|SUCCEEDED|VERIFIED|EXECUTED|RESOLVED|DELIVERED|REVIEWED)$/.test(String(value)) ? "good" : /FAILED|DEAD_LETTERED|REJECTED|SUSPENDED|REMOVED|OVERDUE|DEACTIVATED/.test(String(value)) ? "bad" : /PENDING|REQUESTED|UNDER_REVIEW|INVITED|OPEN|SCHEDULED/.test(String(value)) ? "pending" : "neutral";
  return <span className={`status-badge ${type}`}>{text}</span>;
}

function EvidenceViewer({ url }: { url: string }) {
  const [source, setSource] = useState("");
  const [type, setType] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => () => { if (source) URL.revokeObjectURL(source); }, [source]);
  return <div className="stack">{!source && <button className="button" disabled={busy} onClick={async () => {
    setBusy(true); setError("");
    try {
      const parsed = new URL(url);
      if (!["https:", "http:"].includes(parsed.protocol)) throw new Error("Unsupported evidence URL");
      const response = await fetch(parsed.href, { cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" });
      if (!response.ok) throw new Error("Evidence link expired or unavailable. Reveal it again to get a new link.");
      const blob = await response.blob(); setType(blob.type); setSource(URL.createObjectURL(blob));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load evidence."); }
    finally { setBusy(false); }
  }}><LockKeyhole size={16} />{busy ? "Loading evidence…" : "Load evidence"}</button>}
    {error && <p className="error" role="alert">{error}</p>}
    {source && type.startsWith("image/") && <EvidenceImage source={source} />}
    {source && type.startsWith("video/") && <video src={source} controls preload="none" className="evidence-media" />}
    {source && !type.startsWith("image/") && !type.startsWith("video/") && <a href={source} download="evidence" className="button">Download evidence</a>}
  </div>;
}
function EvidenceImage({ source }: { source: string }) {
  // Signed media is fetched explicitly with no-store, then displayed using a short-lived blob URL.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={source} alt="Case evidence" className="evidence-media" referrerPolicy="no-referrer" />;
}

export function DisplayValue({ value, name = "", compact = false, sensitive = false }: { value: unknown; name?: string; compact?: boolean; sensitive?: boolean }) {
  if (value === null || value === undefined || value === "") return <span className="muted">Not provided</span>;
  if (name === "stale" && typeof value === "boolean") return <StatusBadge value={value ? "OVERDUE" : "ACTIVE"} />;
  if (typeof value === "boolean") return <StatusBadge value={value} />;
  if (typeof value === "number") return <span className="number">{/(Minor|Kobo)$/.test(name) ? new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(value / 100) : value.toLocaleString("en-NG", { maximumFractionDigits: 4 })}</span>;
  if (typeof value === "string") {
    if (sensitive && /^(url|signedUrl)$/i.test(name) && /^https?:\/\//.test(value)) return <EvidenceViewer url={value} />;
    if (!compact && /mediaId$/i.test(name)) return <Link prefetch={false} className="text-button mono record-id" href={`/media?record=${encodeURIComponent(value)}`}>Review media {value} ↗</Link>;
    if (!compact && name === "userId") return <Link prefetch={false} className="text-button mono record-id" href={`/users?record=${encodeURIComponent(value)}`}>Review user {value} ↗</Link>;
    if (/^(status|state|errandStatus)$/.test(name) || /^[A-Z][A-Z_]{2,}$/.test(value) && value.length < 40) return <StatusBadge value={value} />;
    if (/^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value))) return <time dateTime={value} title={`${value} · shown in Africa/Lagos (WAT)`}>{new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }).format(new Date(value))}</time>;
    if (compact && value.length > 90) return <span title={value}>{value.slice(0, 87)}…</span>;
    return <span className={/id$|reference|requestId/i.test(name) ? "mono record-id" : "preserve-lines"}>{value}</span>;
  }
  if (compact) return <span className="muted">{Array.isArray(value) ? `${value.length} items` : "View details"}</span>;
  return <RecordView value={value} sensitive={sensitive} />;
}

export function RecordView({ value, sensitive = false }: { value: unknown; sensitive?: boolean }) {
  if (Array.isArray(value)) return value.length ? <div className="record-list">{value.map((item, i) => <article className="record-item" key={i}><DisplayValue value={item} sensitive={sensitive} /></article>)}</div> : <p className="muted">No entries.</p>;
  if (!value || typeof value !== "object") return <DisplayValue value={value} sensitive={sensitive} />;
  return <dl className="record-fields">{Object.entries(value).map(([name, field]) => <div key={name}><dt>{labelFor(name)}</dt><dd><DisplayValue value={field} name={name} sensitive={sensitive} /></dd></div>)}</dl>;
}

export function DataTable({ rows, columns, onOpen }: { rows: unknown[]; columns: string[]; onOpen?: (row: Record<string, unknown>) => void }) {
  if (!rows.length) return <EmptyState />;
  return <><p className="table-hint muted">Scroll within the table to view additional columns and rows.</p><div className="table-scroll" role="region" aria-label="Records table" tabIndex={0}><Table className="admin-table"><TableHeader><TableRow>{columns.map(c => <TableHead key={c} scope="col">{labelFor(c)}</TableHead>)}{onOpen && <TableHead scope="col"><span className="sr-only">Open record</span></TableHead>}</TableRow></TableHeader><TableBody>{rows.map((row, index) => <TableRow key={String(valueAt(row, "id") ?? valueAt(row, "key") ?? index)}>{columns.map(c => <TableCell key={c}><DisplayValue value={valueAt(row, c)} name={c.split(".").pop()} compact /></TableCell>)}{onOpen && <TableCell><button className="text-button" onClick={() => onOpen(row as Record<string, unknown>)} aria-label={`Review record ${index + 1}`}>Review <span aria-hidden="true">↗</span></button></TableCell>}</TableRow>)}</TableBody></Table></div></>;
}

export function Pagination({ meta, count, cursor, onCursor }: { meta?: ApiMeta; count: number; cursor?: string | null; onCursor: (cursor: string | null) => void }) {
  return <div className="pagination"><span>{count} {count === 1 ? "record" : "records"} on this page</span><div className="toolbar"><button className="button" disabled={!cursor} onClick={() => onCursor(null)}>First page</button><button className="button" disabled={!meta?.hasNextPage || typeof meta.nextCursor !== "string"} onClick={() => onCursor(String(meta?.nextCursor))}>Next page</button></div></div>;
}

export function PerformanceReport({ kind, value }: { kind: string; value: unknown }) {
  if (Array.isArray(value)) return <DataTable rows={value} columns={['area', 'errands', 'errandsWithOffer', 'errandsCompleted', 'offers', 'availableRunnersWithin5km', 'errandsPerRunner']} />;
  const metrics = (keys: string[], notes: Record<string, string> = {}) => <div className="metric-grid">{keys.map(key => {
    const number = valueAt(value, key);
    const rate = /Rate$|Share$|^share/.test(key);
    return <article key={key}><span>{labelFor(key.split('.').pop()!)}</span><b>{rate && typeof number === 'number' ? new Intl.NumberFormat('en-NG', { style: 'percent', maximumFractionDigits: 1 }).format(number) : <DisplayValue name={key} value={number} />}</b><small>{notes[key] ?? 'Within the selected period'}</small></article>;
  })}</div>;
  return <div className="stack">
    <p className="context-note">Last {String(valueAt(value, 'windowDays') ?? 30)} days · Live server report</p>
    {kind === 'analytics-overview' && metrics(['errandsPublished', 'errandsWithOffer', 'shareReceivingOffer', 'errandsCompleted', 'completionRate', 'minutesToFirstOfferMedian', 'minutesToFirstOfferP90', 'averageRating', 'ratingsCount', 'repeatRequesterShare', 'requestersWithCompleted'], {
      shareReceivingOffer: 'Of published errands', completionRate: 'Completed ÷ completed, cancelled and expired errands',
      minutesToFirstOfferMedian: 'Minutes · errands receiving an offer', minutesToFirstOfferP90: 'Minutes · 90th percentile',
      averageRating: 'Overall published, revealed ratings · out of 5', repeatRequesterShare: 'Requesters completing at least two errands ÷ requesters with completions',
    })}
    {kind === 'analytics-funnel' && <><p className="context-note">People registered in this period; each stage counts distinct people, not events.</p>{['all', 'runners', 'requesters'].map(group => <section className="stack" key={group}><h3>{labelFor(group)}</h3>{metrics(Object.keys(valueAt(value, group) as object ?? {}).map(key => `${group}.${key}`))}</section>)}</>}
    {kind === 'analytics-revenue' && <><p className="context-note">Platform purchases only. Amounts are NGN, VAT included; participant payment notes are not revenue.</p>{metrics(['totalGrossMinor', 'totalNetMinor'])}<h3>By product</h3><DataTable rows={valueAt(value, 'streams') as unknown[] ?? []} columns={['type', 'orders', 'grossMinor', 'refundedMinor', 'netMinor']} /><h3>Daily sales · Lagos time</h3><DataTable rows={valueAt(value, 'daily') as unknown[] ?? []} columns={['day', 'type', 'amountMinor']} /></>}
  </div>;
}
