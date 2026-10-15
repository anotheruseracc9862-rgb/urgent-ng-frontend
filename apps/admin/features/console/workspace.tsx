"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Download, LockKeyhole, SlidersHorizontal } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription, Tabs, TabsList, TabsTrigger, TabsContent } from "@urgent/ui";
import { ApiError, type ApiResult } from "@urgent/api-client";
import { adminRequest, ADMIN_API_PREFIX } from "@/lib/api/client";
import { allowed, canVisit, labelFor, recordPath, valueAt } from "./access";
import { ActionResult, canAct, ReasonDialog, type AdminAction } from "./actions";
import type { Resource } from "./catalog";
import { endpoint, type Endpoint, type Field } from "./contracts";
import { SchemaField } from "./fields";
import { AccessDenied, DataTable, ErrorState, LoadingState, Pagination, RecordView } from "./presentation";
import { AuditPanel, RelatedPanel } from "./related";
import { useAdmin } from "./shell";

function FilterBar({ fields, params, apply }: { fields: Field[]; params: URLSearchParams; apply: (values: Record<string, string | null>) => void }) {
  const [values, setValues] = useState<Record<string, unknown>>(() => Object.fromEntries(fields.map(f => [f.name, params.get(f.name) ?? undefined])));
  if (!fields.length) return null;
  function submit(event: FormEvent) { event.preventDefault(); apply(Object.fromEntries(fields.map(f => [f.name, values[f.name] === undefined || values[f.name] === "" ? null : String(values[f.name])]))); }
  return <form className="filter-bar" onSubmit={submit} aria-label="Server filters">{fields.map(f => <SchemaField key={f.name} name={f.name} schema={f.schema} required={f.required} value={values[f.name]} onChange={v => setValues(old => ({ ...old, [f.name]: v }))} />)}<div className="filter-actions"><button className="button primary">Apply filters</button><button className="button" type="button" onClick={() => { setValues({}); apply(Object.fromEntries(fields.map(f => [f.name, null]))); }}>Clear</button></div></form>;
}

function queryFor(operation: Endpoint, params: URLSearchParams) {
  return Object.fromEntries(operation.query.filter(f => params.has(f.name)).map(f => [f.name, params.get(f.name)!]));
}

export function Workspace({ resource }: { resource: Resource }) {
  const admin = useAdmin();
  const router = useRouter();
  const params = useSearchParams();
  const [action, setAction] = useState<AdminAction | null>(null);
  const [result, setResult] = useState<ApiResult<unknown> | null>(null);
  const [exportError, setExportError] = useState<unknown>(null);
  const [exporting, setExporting] = useState(false);
  const operation = resource.list ? endpoint("GET", resource.list) : undefined;
  const query = operation ? queryFor(operation, new URLSearchParams(params.toString())) : {};
  const granted = canVisit(admin, resource);
  const list = useQuery({ queryKey: ["admin", "list", resource.slug, query], queryFn: ({ signal }) => adminRequest(resource.list!, { query, signal }), enabled: !!resource.list && granted, gcTime: 0 });
  function navigate(values: Record<string, string | null>, resetCursor = false) {
    const next = new URLSearchParams(params);
    if (resetCursor) { next.delete("cursor"); next.delete("record"); }
    for (const [key, value] of Object.entries(values)) { if (value === null || value === "") next.delete(key); else next.set(key, value); }
    router.push(`/${resource.slug}${next.size ? `?${next}` : ""}`, { scroll: false });
  }
  if (!granted) return <AccessDenied />;
  const rows = Array.isArray(list.data?.data) ? list.data.data : [];
  const recordId = params.get("record");
  const row = rows.find(r => String(valueAt(r, resource.idKey ?? "id")) === recordId) as Record<string, unknown> | undefined;
  // A narrow default table, with the remaining real fields available through URL-backed visibility.
  const allColumns = resource.columns.length ? resource.columns : rows[0] && typeof rows[0] === "object" ? Object.keys(rows[0]) : [];
  const defaultColumns = allColumns.filter(c => !["reasonText", "payload", "metadata", "photoMediaId", "decidedBy", "requestId", "data"].includes(c)).slice(0, 6);
  const columns = params.has("columns") ? params.get("columns")!.split(",").filter(c => allColumns.includes(c)) : defaultColumns.length ? defaultColumns : allColumns.slice(0, 4);
  const collectionActions = resource.actions?.filter(a => a.scope === "collection" && canAct(a, undefined, admin)) ?? [];
  const filters = operation?.query.filter(f => f.name !== "cursor") ?? [];
  const isPaged = !!operation?.query.some(f => f.name === "cursor");
  async function download(path: string, extra?: Record<string, string>) {
    setExporting(true); setExportError(null);
    try {
      const e = endpoint("GET", path);
      const search = new URLSearchParams({ ...queryFor(e, new URLSearchParams(params)), ...extra });
      const response = await fetch(`${ADMIN_API_PREFIX}${path}?${search}`, { credentials: "include", cache: "no-store" });
      if (!response.ok) {
        const failure = await response.json().catch(() => ({}));
        throw new ApiError(response.status, failure.error?.code ?? "EXPORT_FAILED", failure.error?.message ?? "Export failed. Refresh your session and try again.", failure.error?.details, failure.requestId);
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = `${resource.slug}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setExportError(cause); }
    finally { setExporting(false); }
  }
  return <div className="workspace stack">
    <header className="page-heading"><div><p className="eyebrow">{resource.group}</p><h1>{resource.title}</h1><p>{resource.description}</p></div><div className="toolbar">{collectionActions.map(a => <button key={a.path} className="button primary" onClick={() => setAction(a)}>{labelFor(a.label)}</button>)}{resource.exports?.filter(e => allowed(admin, endpoint("GET", e.path))).map(e => <button key={e.path} className="button" disabled={exporting} onClick={() => void download(e.path, e.query)}><Download size={16} />{exporting ? "Exporting…" : e.label}</button>)}</div></header>
    {result && <ActionResult result={result} />}{!!exportError && <ErrorState error={exportError} />}
    {operation && <FilterBar key={`${resource.slug}:${params.toString()}`} fields={filters} params={new URLSearchParams(params)} apply={v => navigate(v, true)} />}
    {!resource.list && <form className="lookup-form panel" onSubmit={e => { e.preventDefault(); navigate({ record: String(new FormData(e.currentTarget).get("id")).trim() }); }}><label className="field">Record ID<input name="id" defaultValue={recordId ?? ""} required minLength={1} placeholder={resource.slug === "offer-limits" ? "User ID" : "Enter the record ID"} /></label><button className="button primary">Open record</button></form>}
    {resource.list && <section className="panel table-panel"><div className="panel-heading"><div><h2>{resource.slug.startsWith("analytics-") ? "Report" : "Records"}</h2><p>Live server results{params.get("cursor") ? " · Continued page" : ""}</p></div><div className="toolbar"><button className="button" disabled={list.isFetching} onClick={() => void list.refetch()}><RefreshCw size={15} />Refresh</button>{allColumns.length > 0 && Array.isArray(list.data?.data) && <details className="column-menu"><summary className="button"><SlidersHorizontal size={15} />Columns</summary><div>{allColumns.map(c => <label key={c}><input type="checkbox" checked={columns.includes(c)} disabled={columns.length === 1 && columns.includes(c)} onChange={e => navigate({ columns: (e.target.checked ? [...columns, c] : columns.filter(v => v !== c)).join(",") })} />{labelFor(c)}</label>)}</div></details>}</div></div>
      {list.isPending ? <LoadingState /> : list.isError ? <ErrorState error={list.error} retry={() => void list.refetch()} /> : Array.isArray(list.data?.data) ? <><DataTable rows={rows} columns={columns} onOpen={r => navigate({ record: String(valueAt(r, resource.idKey ?? "id") ?? valueAt(r, "id") ?? "") })} />{isPaged && <Pagination meta={list.data.meta} count={rows.length} cursor={params.get("cursor")} onCursor={cursor => navigate({ cursor, record: null })} />}</> : <div className="report-body"><RecordView value={list.data?.data} /></div>}
    </section>}
    {recordId && <RecordDrawer key={`${resource.slug}:${recordId}`} resource={resource} id={recordId} row={row} onClose={() => navigate({ record: null })} onResult={setResult} />}
    {action && <ReasonDialog key={action.path} action={action} onClose={() => setAction(null)} onResult={setResult} />}
  </div>;
}

function RecordDrawer({ resource, id, row, onClose, onResult }: { resource: Resource; id: string; row?: Record<string, unknown>; onClose: () => void; onResult: (result: ApiResult<unknown>) => void }) {
  const admin = useAdmin();
  const [tab, setTab] = useState("details");
  const [action, setAction] = useState<AdminAction | null>(null);
  const detailPath = resource.detail ?? resource.lookup;
  const detail = useQuery({ queryKey: ["admin", "detail", resource.slug, id], queryFn: ({ signal }) => adminRequest(recordPath(detailPath!, id), { signal }), enabled: !!detailPath && allowed(admin, endpoint("GET", detailPath)), gcTime: 0 });
  const record = detail.data?.data ?? row;
  const ready = !detailPath || detail.isSuccess;
  const actions = ready ? resource.actions?.filter(a => a.scope === "record" && canAct(a, record, admin)) ?? [] : [];
  const related = resource.related?.filter(r => allowed(admin, endpoint("GET", r.path))) ?? [];
  const hasAudit = admin.permissions.includes("AUDIT_VIEW") && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id) && resource.slug !== "audit";
  return <Drawer open onOpenChange={open => { if (!open) onClose(); }}><DrawerContent className="admin-drawer"><header><p className="eyebrow">{resource.title}</p><DrawerTitle>Record review</DrawerTitle><DrawerDescription className="mono record-id">{id}</DrawerDescription></header>
    <Tabs value={tab} onValueChange={setTab} className="record-tabs">
    <TabsList className="drawer-tabs" aria-label="Record sections"><TabsTrigger value="details">Details</TabsTrigger>{related.map(r => <TabsTrigger key={r.path} value={r.path}>{r.sensitive && <LockKeyhole size={13} />}{r.label}</TabsTrigger>)}{hasAudit && <TabsTrigger value="audit">Audit history</TabsTrigger>}</TabsList>
    <TabsContent value="details" className="drawer-body">
      {detailPath && detail.isPending ? <LoadingState /> : detailPath && detail.isError ? <ErrorState error={detail.error} retry={() => void detail.refetch()} /> : record ? <RecordView value={record} /> : <p className="muted">Choose a section above to load this record. No sensitive information is loaded automatically.</p>}
        {resource.slug === "refunds" && valueAt(record, "data.status") === "REQUESTED" && <p className="notice">This refund is waiting for a different administrator. The requester cannot approve their own refund.</p>}
        {resource.slug === "approvals" && valueAt(record, "status") === "PENDING" && <p className="notice">Only a different, authorized administrator can approve or reject. The requester may withdraw the request.</p>}
    </TabsContent>
    {related.map(r => <TabsContent key={r.path} value={r.path} className="drawer-body">{tab === r.path && <RelatedPanel key={`${id}:${r.path}`} path={r.path} id={id} sensitive={r.sensitive} />}</TabsContent>)}
    {hasAudit && <TabsContent value="audit" className="drawer-body">{tab === "audit" && <AuditPanel id={id} />}</TabsContent>}
    </Tabs>
    {tab === "details" && actions.length > 0 && <section className="record-actions"><h2>Available actions</h2><p className="muted">Each action is confirmed separately. The backend owns valid state transitions.</p><div className="toolbar">{actions.map(a => <button key={a.path} className="button" onClick={() => setAction(a)}>{labelFor(a.label)}</button>)}</div></section>}
    {action && <ReasonDialog key={action.path} action={action} id={id} record={record} onClose={() => setAction(null)} onResult={onResult} />}
  </DrawerContent></Drawer>;
}
