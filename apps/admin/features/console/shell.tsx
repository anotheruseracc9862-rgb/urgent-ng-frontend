"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@urgent/ui";
import { LayoutDashboard, ShieldCheck, ShoppingBag, FolderOpen, Wallet, Settings2, Users, ChartNoAxesCombined, KeyRound, Menu, LogOut, X } from "lucide-react";
import { adminApi, adminErrorMessage, expireAdminSession } from "@/lib/api/client";
import { ADMIN_EXPIRED_EVENT, ADMIN_IDLE_KEY, DEFAULT_IDLE_SECONDS, type AdminView } from "@/lib/auth/shared";
import { workspaces, visibleTabs } from "./navigation";

const AdminContext = createContext<AdminView | null>(null);
export function useAdmin() {
  const admin = useContext(AdminContext);
  if (!admin) throw new Error("Admin console context is missing");
  return admin;
}
const icons = [Users, ShoppingBag, FolderOpen, Wallet, ChartNoAxesCombined, Settings2, KeyRound];

function IdleSession() {
  const admin = useAdmin();
  const [warning, setWarning] = useState(false);
  const [error, setError] = useState("");
  const deadline = useRef(0);
  const seconds = useRef(DEFAULT_IDLE_SECONDS);
  const lastBroadcast = useRef(0);
  const channel = useRef<BroadcastChannel | null>(null);
  function saveDeadline() {
    try { localStorage.setItem(ADMIN_IDLE_KEY, JSON.stringify({ adminId: admin.id, seconds: seconds.current, deadline: deadline.current })); } catch { /* Memory-only idle lock when storage is unavailable. */ }
  }
  useEffect(() => {
    deadline.current = Date.now() + DEFAULT_IDLE_SECONDS * 1000;
    try {
      const stored = JSON.parse(localStorage.getItem(ADMIN_IDLE_KEY) ?? "null");
      if (stored?.adminId === admin.id && Number.isFinite(stored.deadline) && stored.seconds > 0 && stored.seconds <= DEFAULT_IDLE_SECONDS) {
        seconds.current = stored.seconds; deadline.current = stored.deadline;
      }
    } catch { /* Fall back to the conservative default. */ }
    let expiring = false;
    async function expire() {
      if (expiring) return;
      expiring = true;
      channel.current?.postMessage("logout");
      // Locally lock even when the network is down; never refresh an idle session.
      window.dispatchEvent(new Event(ADMIN_EXPIRED_EVENT));
      try { await adminApi("/auth/logout", { method: "POST", noRefresh: true }); } catch { /* The local lock must not depend on connectivity. */ }
      expireAdminSession();
    }
    channel.current = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("urgent-admin-session");
    if (channel.current) channel.current.onmessage = event => {
      if (event.data === "logout") { expireAdminSession(); return; }
      if (typeof event.data === "number" && event.data > Date.now()) { deadline.current = event.data; setWarning(false); }
    };
    const activity = () => {
      if (Date.now() >= deadline.current) { void expire(); return; }
      // Once warned, require an explicit choice rather than a stray pointer event.
      if (deadline.current - Date.now() <= 60_000) return;
      deadline.current = Date.now() + seconds.current * 1000;
      if (Date.now() - lastBroadcast.current > 5000) {
        try { localStorage.setItem(ADMIN_IDLE_KEY, JSON.stringify({ adminId: admin.id, seconds: seconds.current, deadline: deadline.current })); } catch { /* Memory-only idle lock. */ }
        channel.current?.postMessage(deadline.current); lastBroadcast.current = Date.now();
      }
    };
    const check = () => {
      if (Date.now() >= deadline.current) void expire();
      else setWarning(deadline.current - Date.now() <= 60_000);
    };
    const timer = setInterval(check, 1000);
    check();
    window.addEventListener("pointerdown", activity); window.addEventListener("keydown", activity); window.addEventListener("focus", check);
    return () => { clearInterval(timer); channel.current?.close(); window.removeEventListener("pointerdown", activity); window.removeEventListener("keydown", activity); window.removeEventListener("focus", check); };
  }, [admin.id]);
  if (!warning) return null;
  return <div className="idle-warning notice" role="alert"><b>Your session will lock in less than a minute.</b><p>No activity has been detected. Continue only if you are still using this console.</p>{error && <p className="error">{error}</p>}<button className="button primary" onClick={async () => {
    try { await adminApi("/auth/me", { noRefresh: true }); deadline.current = Date.now() + seconds.current * 1000; saveDeadline(); channel.current?.postMessage(deadline.current); setWarning(false); }
    catch (cause) { setError(adminErrorMessage(cause)); }
  }}>Continue working</button></div>;
}

export function ConsoleShell({ initialAdmin, children }: { initialAdmin: AdminView; children: React.ReactNode }) {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const me = useQuery({ queryKey: ["admin", "me"], queryFn: () => adminApi<AdminView>("/auth/me"), initialData: initialAdmin, refetchInterval: 60_000, refetchOnWindowFocus: true });
  const admin = me.data;
  const current = workspaces.find(w => pathname === `/${w.slug}` || pathname.startsWith(`/${w.slug}/`));
  const visible = workspaces.filter(w => visibleTabs(w, admin).length);
  async function logout() {
    setLoggingOut(true);
    try { await adminApi("/auth/logout", { method: "POST", noRefresh: true }); } catch { /* The proxy clears local cookies even if the upstream is unavailable. */ } finally {
      const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("urgent-admin-session"); channel?.postMessage("logout"); channel?.close(); expireAdminSession();
    }
  }
  const navigation = <>
      <Link href="/dashboard" className="brand" onClick={() => setMenu(false)}><span className="brand-mark" aria-hidden="true">U</span><span>Urgent.ng<small>OPERATIONS</small></span></Link>
      <nav aria-label="Admin workspaces">
        <h2>Work</h2>
        <Link href="/dashboard" prefetch={false} className={pathname === "/dashboard" ? "active" : ""} aria-current={pathname === "/dashboard" ? "page" : undefined} onClick={() => setMenu(false)}><LayoutDashboard size={18} aria-hidden="true" />Dashboard</Link>
        {['work', 'manage'].map(group => <section key={group}>{group === 'manage' && visible.some(w => workspaces.indexOf(w) >= 4) && <h2>Manage</h2>}{visible.filter(w => (workspaces.indexOf(w) < 4) === (group === 'work')).map(w => {
          const Icon = icons[workspaces.indexOf(w)];
          return <Link key={w.slug} href={`/${w.slug}`} prefetch={false} className={current?.slug === w.slug ? 'active' : ''} aria-current={current?.slug === w.slug ? 'page' : undefined} onClick={() => setMenu(false)}><Icon size={18} aria-hidden="true" />{w.title}</Link>;
        })}</section>)}
      </nav>
      <footer><span className="admin-avatar" aria-hidden="true">{admin.displayName.split(" ").map(s => s[0]).slice(0, 2).join("")}</span><div><b>{admin.displayName}</b><small>MFA secured · {admin.roles.join(", ") || "No roles assigned"}</small></div></footer>
  </>;
  return <AdminContext value={admin}><div className="console">
    <a className="skip-link" href="#console-main">Skip to workspace</a>
    <aside className="console-sidebar desktop-sidebar" aria-label="Console navigation">{navigation}</aside>
    <Drawer open={menu} onOpenChange={setMenu}><DrawerContent side="left" className="console-sidebar mobile-sidebar"><DrawerTitle className="sr-only">Console navigation</DrawerTitle><DrawerDescription className="sr-only">Choose an authorized workspace.</DrawerDescription>{navigation}</DrawerContent></Drawer>
    <div className="console-main"><header className="console-topbar"><div className="toolbar"><button className="icon-button mobile-menu" aria-label={menu ? "Close navigation" : "Open navigation"} aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X size={20} /> : <Menu size={20} />}</button><ShieldCheck size={17} aria-hidden="true" /><span>Admin console <span className="muted">/ {current?.title ?? "Dashboard"}</span></span></div><button className="button quiet" disabled={loggingOut} onClick={() => void logout()}><LogOut size={16} />{loggingOut ? "Signing out…" : "Sign out"}</button></header>
      <main id="console-main" tabIndex={-1}>{me.isError && <p className="error" role="alert">Could not refresh permissions. {adminErrorMessage(me.error)} <button className="text-button" onClick={() => void me.refetch()}>Retry</button></p>}{children}</main>
      <footer className="console-footer"><ShieldCheck size={14} aria-hidden="true" />Restricted access. Actions are permission-checked and audited by the server.</footer>
    </div><IdleSession />
  </div></AdminContext>;
}
