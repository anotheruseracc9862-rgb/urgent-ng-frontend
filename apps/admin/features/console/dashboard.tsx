"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ClipboardCheck } from "lucide-react";
import { adminApi } from "@/lib/api/client";
import { PageHead } from "@/components/page-head";
import { resources } from "./catalog";
import { canVisit, labelFor } from "./access";
import { DataTable, DisplayValue, ErrorState, LoadingState } from "./presentation";
import { useAdmin } from "./shell";
import { resourceLocation } from "./navigation";

export function Dashboard() {
  const admin = useAdmin();
  const visible = resources.filter(r => canVisit(admin, r));
  const analytics = useQuery({ queryKey: ["admin", "overview"], queryFn: ({ signal }) => adminApi<Record<string, unknown>>("/analytics/overview", { query: { days: 30 }, signal }), enabled: admin.permissions.includes("ANALYTICS_VIEW"), gcTime: 0 });
  const audit = useQuery({ queryKey: ["admin", "recent-audit"], queryFn: ({ signal }) => adminApi<unknown[]>("/audit", { query: { limit: 5 }, signal }), enabled: admin.permissions.includes("AUDIT_VIEW"), gcTime: 0 });
  const attention = ["disputes", "reports", "verifications", "approvals", "outbox"].map(slug => visible.find(r => r.slug === slug)).filter(r => !!r);
  return <div className="stack dashboard"><PageHead eyebrow={`Welcome back, ${admin.displayName.split(' ')[0]}`} title="Dashboard" description="Review what needs attention, then get back to the work that matters." />
    <section className="panel"><div className="section-heading"><h2><ClipboardCheck size={18} />Start with a review queue</h2><span className="muted">Your authorized work</span></div><div className="attention-grid">{attention.map(r => <Link key={r.slug} href={resourceLocation(r.slug)} prefetch={false}><span><b>{r.slug === 'verifications' ? 'Review verifications' : r.slug === 'approvals' ? 'Review approvals' : r.slug === 'outbox' ? 'Check failed background events' : `Review ${r.title.toLowerCase()}`}</b><small>{r.slug === "approvals" ? "Your requests and authorized decisions" : r.slug === "outbox" ? "Dead letters and retry outcomes" : r.slug === 'verifications' ? 'Identity attempts awaiting review' : "Assignment, deadlines and resolution"}</small></span><ArrowUpRight size={18} /></Link>)}</div></section>
    {admin.permissions.includes("ANALYTICS_VIEW") && <section aria-label="Last 30 days"><div className="section-heading"><h2>Marketplace at a glance</h2><Link prefetch={false} href={resourceLocation('analytics-overview')}>Last 30 days · Full report <ArrowUpRight size={15} /></Link></div>{analytics.isPending ? <LoadingState /> : analytics.isError ? <ErrorState error={analytics.error} retry={() => void analytics.refetch()} /> : <div className="metric-grid">{["errandsPublished", "errandsCompleted", "minutesToFirstOfferMedian", "averageRating"].map(key => <article key={key}><span>{labelFor(key)}</span><b><DisplayValue name={key} value={analytics.data[key]} /></b><small>{key === "minutesToFirstOfferMedian" ? "Minutes · server median" : "Last 30 days"}</small></article>)}</div>}</section>}
    {admin.permissions.includes("AUDIT_VIEW") && <section className="panel table-panel"><div className="panel-heading"><div><h2>Recent audit activity</h2><p>Actions recorded by the backend</p></div><Link href={resourceLocation('audit')} prefetch={false} className="text-button">All activity ↗</Link></div>{audit.isPending ? <LoadingState /> : audit.isError ? <ErrorState error={audit.error} retry={() => void audit.refetch()} /> : <DataTable rows={audit.data} columns={["createdAt", "action", "actorType", "reasonCode"]} />}</section>}
    {visible.length === 1 && <p className="notice">Your account has no domain permissions yet. You can view your own approval requests; ask an administrator to assign the access you need.</p>}
  </div>;
}
