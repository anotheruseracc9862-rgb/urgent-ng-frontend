"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LockKeyhole } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@urgent/ui";
import type { ApiResult } from "@urgent/api-client";
import { adminApi, adminRequest } from "@/lib/api/client";
import { allowed, recordPath } from "./access";
import { endpoint } from "./contracts";
import { SchemaField } from "./fields";
import { DataTable, EmptyState, ErrorState, LoadingState, Pagination, RecordView } from "./presentation";
import { useAdmin } from "./shell";

/** Separate component lifetime: changing record/tab unmounts and discards revealed data. */
export function RelatedPanel({ path, id, sensitive = false }: { path: string; id: string; sensitive?: boolean }) {
  const admin = useAdmin();
  if (!allowed(admin, endpoint("GET", path))) return null;
  return sensitive ? <SensitiveGate path={path} id={id} /> : <PublicRelated path={path} id={id} />;
}
function PublicRelated({ path, id }: { path: string; id: string }) {
  const [cursor, setCursor] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["admin", "related", path, id, cursor], queryFn: ({ signal }) => adminRequest(recordPath(path, id), { query: { cursor: cursor ?? undefined }, signal }), gcTime: 0 });
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  return <><RecordView value={query.data.data} />{query.data.meta && <Pagination meta={query.data.meta} count={Array.isArray(query.data.data) ? query.data.data.length : 0} cursor={cursor} onCursor={setCursor} />}</>;
}

export function SensitiveGate({ path, id }: { path: string; id: string }) {
  const [result, setResult] = useState<ApiResult<unknown> | null>(null);
  const [modal, setModal] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [reasonCode, setReasonCode] = useState<unknown>();
  const [reasonText, setReasonText] = useState<unknown>();
  const [variant, setVariant] = useState<unknown>();
  const reasons = useQuery({ queryKey: ["admin", "reason-codes"], queryFn: () => adminApi<{ codes: string[] }>("/reason-codes"), enabled: modal });
  const operation = endpoint("GET", path);
  async function reveal(cursor?: string) {
    if (!reasons.data?.codes.includes(String(reasonCode)) || reasonCode === "OTHER" && !String(reasonText ?? "").trim()) return;
    setBusy(true); setError(null);
    try {
      const query: Record<string, string> = {};
      for (const field of operation.query) {
        if (field.name === "reasonCode") query.reasonCode = String(reasonCode);
        if (field.name === "reasonText" && reasonText) query.reasonText = String(reasonText);
        if (field.name === "variant" && variant) query.variant = String(variant);
      }
      if (cursor) query.cursor = cursor;
      setResult(await adminRequest(recordPath(path, id), { query })); setModal(false);
    } catch (cause) { setError(cause); }
    finally { setBusy(false); }
  }
  return <div className="stack"><div className="sensitive-notice"><LockKeyhole size={20} /><div><b>Sensitive information</b><p>Access requires a separate permission and is audited. Revealed data is not saved in the query cache.</p></div></div>
    {result ? <><button className="button" onClick={() => { setResult(null); setReasonCode(undefined); setReasonText(undefined); }}>Hide sensitive data</button><RecordView value={result.data} sensitive />{result.meta && <Pagination meta={result.meta} count={Array.isArray(result.data) ? result.data.length : 0} onCursor={cursor => void reveal(cursor ?? undefined)} />}</> : <button className="button" onClick={() => setModal(true)}><LockKeyhole size={16} />Reveal with a reason</button>}
    {!!error && <ErrorState error={error} />}
    {modal && <Dialog open onOpenChange={open => { if (!open && !busy) setModal(false); }}><DialogContent className="admin-dialog"><DialogTitle>Reveal sensitive information</DialogTitle><DialogDescription>The server records this access. Do not copy this information outside an authorized case.</DialogDescription><form className="stack" onSubmit={e => { e.preventDefault(); if (!busy) void reveal(); }}>
      {reasons.isError ? <ErrorState error={reasons.error} retry={() => void reasons.refetch()} /> : <SchemaField name="reasonCode" schema={{ type: "string", enum: reasons.data?.codes ?? [] }} value={reasonCode} required onChange={setReasonCode} />}
      <SchemaField name="reasonText" schema={{ type: "string", maxLength: 1000 }} value={reasonText} required={reasonCode === "OTHER"} onChange={setReasonText} />
      {operation.query.filter(f => f.name === "variant").map(f => <SchemaField key={f.name} name={f.name} schema={f.schema} required={f.required} value={variant} onChange={setVariant} />)}
      <button className="button primary" disabled={busy || !reasons.data}>{busy ? "Loading…" : "Reveal information"}</button>
    </form></DialogContent></Dialog>}
  </div>;
}

export function AuditPanel({ id }: { id: string }) {
  const admin = useAdmin();
  const [cursor, setCursor] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["admin", "audit-history", id, cursor], queryFn: ({ signal }) => adminRequest<unknown[]>("/audit", { query: { entityId: id, cursor: cursor ?? undefined }, signal }), enabled: admin.permissions.includes("AUDIT_VIEW"), gcTime: 0 });
  if (!admin.permissions.includes("AUDIT_VIEW")) return null;
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  return query.data.data.length ? <><DataTable rows={query.data.data} columns={["createdAt", "action", "actorId", "reasonCode"]} /><Pagination meta={query.data.meta} count={query.data.data.length} cursor={cursor} onCursor={setCursor} /><details><summary>Audit metadata and request IDs</summary><RecordView value={query.data.data} /></details></> : <EmptyState />;
}
