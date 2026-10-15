"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ShieldCheck, ClipboardCheck, Activity } from "lucide-react";
import { adminApi } from "@/lib/api/client";
import { resources } from "./catalog";
import { canVisit, labelFor } from "./access";
import { DataTable, DisplayValue, ErrorState, LoadingState } from "./presentation";
import { useAdmin } from "./shell";

export function Dashboard() {
  const admin = useAdmin();
  const visible = resources.filter(r => canVisit(admin, r));
  const analytics = useQuery({ queryKey: ["admin", "overview"], queryFn: ({ signal }) => adminApi<Record<string, unknown>>("/analytics/overview", { query: { days: 30 }, signal }), enabled: admin.permissions.includes("ANALYTICS_VIEW"), gcTime: 0 });
  const audit = useQuery({ queryKey: ["admin", "recent-audit"], queryFn: ({ signal }) => adminApi<unknown[]>("/audit", { query: { limit: 5 }, signal }), enabled: admin.permissions.includes("AUDIT_VIEW"), gcTime: 0 });
  const attention = ["disputes", "reports", "verifications", "approvals", "outbox"].map(slug => visible.find(r => r.slug === slug)).filter(r => !!r);
  return <div className="stack dashboard"><header className="page-heading"><div><p className="eyebrow">OPERATIONS OVERVIEW</p><h1>Your operations workspace</h1><p>Review the marketplace, resolve cases, and keep Urgent.ng running safely.</p></div><span className="security-label"><ShieldCheck size={16} />MFA verified</span></header>
    {admin.permissions.includes("ANALYTICS_VIEW") && <section aria-label="Last 30 days"><div className="section-heading"><h2>Marketplace at a glance</h2><Link prefetch={false} href="/analytics-overview">Last 30 days · Full report <ArrowUpRight size={15} /></Link></div>{analytics.isPending ? <LoadingState /> : analytics.isError ? <ErrorState error={analytics.error} retry={() => void analytics.refetch()} /> : <div className="metric-grid">{["errandsPublished", "errandsCompleted", "minutesToFirstOfferMedian", "averageRating"].map(key => <article key={key}><span>{labelFor(key)}</span><b><DisplayValue name={key} value={analytics.data[key]} /></b><small>{key === "minutesToFirstOfferMedian" ? "Minutes · server median" : "Reported by the server · 30 days"}</small></article>)}</div>}</section>}
    <div className="overview-grid"><section className="panel"><div className="section-heading"><h2><ClipboardCheck size={18} />Review queues</h2></div><p className="muted">Open a queue to see the current server-filtered records.</p><div className="attention-list">{attention.map(r => <Link key={r.slug} href={`/${r.slug}`} prefetch={false}><span><b>{r.title}</b><small>{r.slug === "approvals" ? "Second-administrator decisions" : r.slug === "outbox" ? "Dead letters and retry outcomes" : "Unassigned, overdue, and recent cases"}</small></span><ArrowUpRight size={18} /></Link>)}</div></section><section className="panel"><h2><Activity size={18} />Session and access</h2><dl className="session-facts"><div><dt>Signed in as</dt><dd>{admin.displayName}</dd></div><div><dt>Assigned roles</dt><dd>{admin.roles.join(", ") || "No roles yet"}</dd></div><div><dt>Idle lock</dt><dd>15 minutes with a one-minute warning</dd></div></dl><p className="notice">Sensitive data is revealed separately. High-risk requests may wait for another administrator.</p></section></div>
    {admin.permissions.includes("AUDIT_VIEW") && <section className="panel table-panel"><div className="panel-heading"><div><h2>Recent audit activity</h2><p>Actions recorded by the backend</p></div><Link href="/audit" prefetch={false} className="text-button">All activity ↗</Link></div>{audit.isPending ? <LoadingState /> : audit.isError ? <ErrorState error={audit.error} retry={() => void audit.refetch()} /> : <DataTable rows={audit.data} columns={["createdAt", "action", "actorType", "reasonCode"]} />}</section>}
    {visible.length === 1 && <p className="notice">Your account has no domain permissions yet. You can view your own approval requests; ask an administrator to assign the access you need.</p>}
  </div>;
}
