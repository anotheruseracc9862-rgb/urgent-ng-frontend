"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
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
import { detailLocation, resourceLocation } from "./navigation";

function FilterBar({ fields, params, apply, leading }: { fields: Field[]; params: URLSearchParams; leading?: ReactNode; apply: (values: Record<string, string | null>) => void }) {
  const [values, setValues] = useState<Record<string, unknown>>(() => Object.fromEntries(fields.map(f => [f.name, params.get(f.name) ?? undefined])));
  if (!fields.length) return null;
  function submit(event: FormEvent) { event.preventDefault(); apply(Object.fromEntries(fields.map(f => [f.name, values[f.name] === undefined || values[f.name] === "" ? null : String(values[f.name])]))); }
  const primary = fields.filter(f => ['q', 'status', 'days'].includes(f.name));
  const advanced = fields.filter(f => !primary.includes(f));
  // The reports accept a bounded day count; offer honest presets rather than a free number.
  const field = (f: Field) => f.name === 'days'
    ? <label key="days" className="field">Time window<select value={String(values.days ?? '30')} onChange={e => setValues(old => ({ ...old, days: e.target.value }))}>{[7, 30, 90, 365].map(d => <option key={d} value={d}>{d === 365 ? 'Last 12 months' : `Last ${d} days`}</option>)}</select></label>
    : <SchemaField key={f.name} name={f.name} schema={f.schema} emptyLabel="Any / default" required={f.required} value={values[f.name]} onChange={v => setValues(old => ({ ...old, [f.name]: v }))} />;
  return <form className="filter-bar" onSubmit={submit} aria-label="Server filters">{leading}{primary.map(field)}{advanced.length > 0 && <details className="advanced-filters"><summary className="button"><SlidersHorizontal size={15} />More filters</summary><div className="filter-bar">{advanced.map(field)}</div></details>}<div className="filter-actions"><button className="button primary">Apply filters</button><button className="button" type="button" onClick={() => { setValues({}); apply(Object.fromEntries(fields.map(f => [f.name, null]))); }}>Clear</button></div></form>;
}

function queryFor(operation: Endpoint, params: URLSearchParams) {
  return Object.fromEntries(operation.query.filter(f => params.has(f.name)).map(f => [f.name, params.get(f.name)!]));
}

export function Workspace({ resource, resetScope = false, leading }: { resource: Resource; resetScope?: boolean; leading?: ReactNode }) {
  const admin = useAdmin();
  const router = useRouter();
  const urlParams = useSearchParams();
  const params = resetScope ? new URLSearchParams() : urlParams;
  const [action, setAction] = useState<AdminAction | null>(null);
  const [result, setResult] = useState<ApiResult<unknown> | null>(null);
  const [exportError, setExportError] = useState<unknown>(null);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const operation = resource.list ? endpoint("GET", resource.list) : undefined;
  const query = operation ? queryFor(operation, new URLSearchParams(params.toString())) : {};
  if (operation?.query.some(f => f.name === 'q')) { delete query.q; if (search) query.q = search; }
  const granted = canVisit(admin, resource);
  const list = useQuery({ queryKey: ["admin", "list", resource.slug, query], queryFn: ({ signal }) => adminRequest(resource.list!, { query, signal }), enabled: !!resource.list && granted, gcTime: 0 });
  function navigate(values: Record<string, string | null>, resetCursor = false) {
    const next = new URLSearchParams(params);
    if (resetCursor) { next.delete("cursor"); next.delete("record"); }
    for (const [key, value] of Object.entries(values)) { if (value === null || value === "") next.delete(key); else next.set(key, value); }
    next.delete('q');
    router.push(resourceLocation(resource.slug, Object.fromEntries(next)), { scroll: false });
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
  const filterParams = new URLSearchParams(params);
  if (search) filterParams.set('q', search);
  const isPaged = !!operation?.query.some(f => f.name === "cursor");
  async function download(path: string, extra?: Record<string, string>) {
    setExporting(true); setExportError(null);
    try {
      const e = endpoint("GET", path);
      const exportQuery = new URLSearchParams({ ...queryFor(e, new URLSearchParams(params)), ...extra });
      const response = await fetch(`${ADMIN_API_PREFIX}${path}?${exportQuery}`, { credentials: "include", cache: "no-store" });
      if (!response.ok) {
        const failure = await response.json().catch(() => ({}));
        throw new ApiError(response.status, failure.error?.code ?? "EXPORT_FAILED", failure.error?.message ?? "Export failed. Refresh your session and try again.", failure.error?.details, failure.requestId);
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = `${resource.slug}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setExportError(cause); }
    finally { setExporting(false); }
  }
  const toolbarButtons = <>{collectionActions.map(a => <button key={a.path} className="button primary" onClick={() => setAction(a)}>{labelFor(a.label)}</button>)}{resource.exports?.filter(e => allowed(admin, endpoint("GET", e.path))).map(e => <button key={e.path} className="button" disabled={exporting} onClick={() => void download(e.path, e.query)}><Download size={16} />{exporting ? "Exporting…" : e.label}</button>)}</>;
  const hasToolbar = collectionActions.length > 0 || !!resource.exports?.some(e => allowed(admin, endpoint("GET", e.path)));
  return <div className="workspace stack">
    <header className={hasToolbar && !resource.list ? "section-heading" : "sr-only"}><div><h2>{resource.title.replace('Analytics: ', '')}</h2></div>{!resource.list && <div className="toolbar">{toolbarButtons}</div>}</header>
    {result && <ActionResult result={result} />}{!!exportError && <ErrorState error={exportError} />}
    {operation && <FilterBar key={`${resource.slug}:${filterParams.toString()}`} fields={filters} params={filterParams} leading={leading} apply={v => { if ('q' in v) setSearch(v.q ?? ''); navigate(v, true); }} />}
    {!resource.list && <form className="lookup-form panel" onSubmit={e => { e.preventDefault(); navigate({ record: String(new FormData(e.currentTarget).get("id")).trim() }); }}>{leading}<label className="field">Record ID<input name="id" defaultValue={recordId ?? ""} required minLength={1} placeholder={resource.slug === "offer-limits" ? "User ID" : "Enter the record ID"} /></label><button className="button primary">Open record</button></form>}
    {resource.list && <section className="panel table-panel"><div className="panel-heading"><div>{filters.length === 0 && leading}<h2>{resource.slug.startsWith("analytics-") ? "Report" : "Records"}</h2><p>Live server results{params.get("cursor") ? " · Continued page" : ""}</p></div><div className="toolbar">{toolbarButtons}<button className="button" disabled={list.isFetching} onClick={() => void list.refetch()}><RefreshCw size={15} />Refresh</button>{allColumns.length > 0 && Array.isArray(list.data?.data) && <details className="column-menu"><summary className="button"><SlidersHorizontal size={15} />Columns</summary><div>{allColumns.map(c => <label key={c}><input type="checkbox" checked={columns.includes(c)} disabled={columns.length === 1 && columns.includes(c)} onChange={e => navigate({ columns: (e.target.checked ? [...columns, c] : columns.filter(v => v !== c)).join(",") })} />{labelFor(c)}</label>)}</div></details>}</div></div>
      {list.isPending ? <LoadingState /> : list.isError ? (list.error instanceof ApiError && list.error.status === 400 && params.has("cursor")
        ? <div className="notice" role="alert"><b>This page link is out of date.</b><p>Queue ordering changed, so the saved position no longer works. Start again from the first page.</p><button className="button" onClick={() => navigate({ cursor: null, record: null })}>Back to first page</button></div>
        : <ErrorState error={list.error} retry={() => void list.refetch()} />) : Array.isArray(list.data?.data) ? <><DataTable rows={rows} columns={columns} onOpen={r => {
        const id = String(valueAt(r, resource.idKey ?? 'id') ?? valueAt(r, 'id') ?? '');
        const detail = detailLocation(resource.slug, id);
        if (detail) router.push(`${detail}?${new URLSearchParams({ back: resourceLocation(resource.slug, Object.fromEntries(new URLSearchParams(params))) })}`);
        else navigate({ record: id });
      }} />{isPaged && <Pagination meta={list.data.meta} count={rows.length} cursor={params.get("cursor")} onCursor={cursor => navigate({ cursor, record: null })} />}</> : <div className="report-body"><RecordView value={list.data?.data} /></div>}
    </section>}
    {recordId && <RecordDrawer key={`${resource.slug}:${recordId}`} resource={resource} id={recordId} row={row} onClose={() => navigate({ record: null })} onResult={setResult} />}
    {action && <ReasonDialog key={action.path} action={action} onClose={() => setAction(null)} onResult={setResult} />}
  </div>;
}

export function RecordDrawer({ resource, id, row, onClose, onResult }: { resource: Resource; id: string; row?: Record<string, unknown>; onClose: () => void; onResult: (result: ApiResult<unknown>) => void }) {
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
  if (!canVisit(admin, resource)) return <AccessDenied />;
  const parentErrand = valueAt(record, 'errand.id') ?? valueAt(record, 'errandId');
  return <Drawer open onOpenChange={open => { if (!open) onClose(); }}><DrawerContent className="admin-drawer"><header><p className="eyebrow">{resource.title}</p><DrawerTitle>Record review</DrawerTitle><DrawerDescription className="mono record-id">{id}</DrawerDescription></header>
    <Tabs value={tab} onValueChange={setTab} className="record-tabs">
    <TabsList className="drawer-tabs" aria-label="Record sections"><TabsTrigger value="details">Details</TabsTrigger>{related.map(r => <TabsTrigger key={r.path} value={r.path}>{r.sensitive && <LockKeyhole size={13} />}{r.label}</TabsTrigger>)}{hasAudit && <TabsTrigger value="audit">Audit history</TabsTrigger>}</TabsList>
    <TabsContent value="details" className="drawer-body">
      {typeof parentErrand === 'string' && admin.permissions.includes('ERRANDS_VIEW') && <Link className="text-button" prefetch={false} href={detailLocation('errands', parentErrand)!}>Open related errand ↗</Link>}
      {resource.slug === 'assignments' && <p className="context-note">Payment agreement fields describe an optional note between participants. Urgent.ng does not collect or enforce this payment.</p>}
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
