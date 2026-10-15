"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@urgent/ui";
import { ApiError, type ApiMethod, type ApiResult } from "@urgent/api-client";
import { adminApi, adminRequest } from "@/lib/api/client";
import { allowed, labelFor, recordPath, valueAt } from "./access";
import type { Resource } from "./catalog";
import { endpoint, type Schema } from "./contracts";
import { SchemaField, requestValue } from "./fields";
import { ErrorState, RecordView } from "./presentation";
import { useAdmin } from "./shell";

export type AdminAction = NonNullable<Resource["actions"]>[number];
export function canAct(action: AdminAction, record: unknown, admin: ReturnType<typeof useAdmin>): boolean {
  if (!allowed(admin, endpoint(action.method, action.path))) return false;
  if (action.when && !action.when.values.includes(valueAt(record, action.when.field))) return false;
  if (action.approvalDecision) {
    if (valueAt(record, "status") !== "PENDING") return false;
    if (Date.parse(String(valueAt(record, "expiresAt"))) <= Date.now()) return false;
    if (action.approvalDecision === "cancel") return valueAt(record, "requestedBy") === admin.id;
    return valueAt(record, "canDecide") === true;
  }
  if (action.path.startsWith("/refunds/") && /approve|reject/.test(action.path)) {
    if (valueAt(record, "data.status") !== "REQUESTED") return false;
    if (action.path.endsWith("/approve") && valueAt(record, "data.requestedById") === admin.id) return false;
  }
  return true;
}

export function ActionResult({ result }: { result: ApiResult<unknown> }) {
  const pending = valueAt(result.data, "approvalRequired") === true || valueAt(result.data, "waitingForSecondAdmin") === true;
  const approvalId = valueAt(result.data, "approval.id");
  const auditId = valueAt(result.data, "auditId");
  return <section className={`action-result ${pending ? "notice" : "success-notice"}`} aria-live="polite"><h2>{pending ? "Waiting for a different administrator" : "Server result"}</h2><p>{pending ? "The request has been recorded. Do not treat it as an applied change until it is approved and executed." : "The server returned the following outcome. No local state-machine override was applied."}</p>
    {pending && <Link className="text-button" prefetch={false} href={valueAt(result.data, "waitingForSecondAdmin") ? "/refunds?status=REQUESTED" : `/approvals${approvalId ? `?record=${encodeURIComponent(String(approvalId))}` : ""}`}>Review pending request ↗</Link>}
    <details><summary>Inspect result and request ID</summary><RecordView value={result.data} /><p className="mono">Request ID: {result.requestId ?? "Not returned"}</p></details>
    <AuditResultLink requestId={result.requestId} auditId={auditId} />
  </section>;
}
function AuditResultLink({ requestId, auditId }: { requestId?: string; auditId?: unknown }) {
  const admin = useAdmin();
  if (!admin.permissions.includes("AUDIT_VIEW")) return null;
  return <Link prefetch={false} className="text-button" href={auditId ? `/audit?record=${encodeURIComponent(String(auditId))}` : "/audit"}>{requestId ? "Open audit log to inspect the matching request" : "Open audit log"} ↗</Link>;
}

export function ReasonDialog({ action, id, record, onClose, onResult }: { action: AdminAction; id?: string; record?: unknown; onClose: () => void; onResult: (result: ApiResult<unknown>) => void }) {
  const admin = useAdmin();
  const operation = endpoint(action.method, action.path);
  const client = useQueryClient();
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [targetId, setTargetId] = useState(id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const submitted = useRef(false);
  const needsReason = !!operation.body?.properties?.reasonCode;
  const reasons = useQuery({ queryKey: ["admin", "reason-codes"], queryFn: () => adminApi<{ codes: string[] }>("/reason-codes"), enabled: needsReason });
  const fields = operation.body?.properties ?? {};
  const needsId = action.path.includes("{");
  const canSubmit = canAct(action, record, admin);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitted.current || !canSubmit) return;
    if (needsReason && (!reasons.data?.codes.includes(String(values.reasonCode)) || values.reasonCode === "OTHER" && !String(values.reasonText ?? "").trim())) return;
    submitted.current = true; setBusy(true); setError(null);
    try {
      const body = operation.hasBody ? requestValue(values, operation.body ?? {}) : undefined;
      const result = await adminRequest(recordPath(action.path, targetId), { method: action.method as ApiMethod, body });
      // Do not invalidate /me away while an action is resolving. All other server state is re-read.
      await client.invalidateQueries({ predicate: query => query.queryKey[0] === "admin" && query.queryKey[1] !== "me" });
      onResult(result); onClose();
    } catch (cause) { setError(cause); }
    finally { submitted.current = false; setBusy(false); }
  }
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent className="admin-dialog"><DialogTitle>{labelFor(action.label)}</DialogTitle><DialogDescription>{operation.summary ?? "Review the target and confirm. The server checks your permissions and validates the action."}</DialogDescription>
    <form onSubmit={submit} className="stack" aria-busy={busy}><fieldset disabled={busy} className="stack action-fields">
      {needsId && (id ? <p className="mono">Target: {id}</p> : <SchemaField name="target ID" schema={{ type: "string", minLength: 1 }} required value={targetId} onChange={v => setTargetId(String(v ?? ""))} />)}
      {Object.entries(fields).filter(([name]) => name !== "reasonCode" && name !== "reasonText").map(([name, original]) => {
        const schema: Schema = name === "value" && operation.path.startsWith("/config/") && typeof valueAt(record, "value") !== "undefined" ? { ...original, oneOf: undefined, type: typeof valueAt(record, "value") } : original;
        return <SchemaField key={name} name={name} schema={schema} value={values[name]} required={operation.body?.required?.includes(name)} onChange={v => setValues(old => ({ ...old, [name]: v }))} />;
      })}
      {needsReason && <div className="reason-block stack"><h3>Reason for this action</h3><p className="muted">This reason is attached to the server audit record.</p>{reasons.isError ? <ErrorState error={reasons.error} retry={() => void reasons.refetch()} /> : <SchemaField name="reasonCode" schema={{ type: "string", enum: reasons.data?.codes ?? [] }} value={values.reasonCode} required onChange={v => setValues(old => ({ ...old, reasonCode: v }))} />}<SchemaField name="reasonText" schema={{ type: "string", maxLength: 1000 }} value={values.reasonText} required={values.reasonCode === "OTHER"} onChange={v => setValues(old => ({ ...old, reasonText: v }))} /></div>}
    </fieldset>
      {!canSubmit && <p className="error" role="alert">You cannot perform this action on this record. Approval decisions require the server&apos;s permission and a different requesting administrator.</p>}
      {!!error && <><ErrorState error={error} />{error instanceof ApiError && (error.status === 0 || error.status >= 500) && <p className="notice">The outcome may be unknown. Close this dialog and refresh the record before deciding whether to submit again.</p>}</>}
      <div className="dialog-actions"><button className="button" type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="button primary" disabled={busy || !canSubmit || needsReason && !reasons.data}>{busy ? "Submitting…" : "Confirm action"}</button></div>
    </form>
  </DialogContent></Dialog>;
}
