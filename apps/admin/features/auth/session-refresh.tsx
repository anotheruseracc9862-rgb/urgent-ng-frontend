"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { adminErrorMessage, expireAdminSession, refreshAdminSession } from "../../lib/api/client";
import { ApiError } from "@urgent/api-client";
import { safeAdminReturnTo } from "../../lib/auth/shared";
import { AuthPanel } from "./auth-panel";

const LOOP_KEY = "ung_admin_refresh_loop";

/** True when a refresh already "succeeded" twice in the last 30s yet the console still rejected the session. */
function refreshLooping(): boolean {
  try {
    const now = Date.now();
    const recent = (JSON.parse(sessionStorage.getItem(LOOP_KEY) ?? "[]") as number[]).filter((at) => now - at < 30_000);
    recent.push(now);
    sessionStorage.setItem(LOOP_KEY, JSON.stringify(recent));
    return recent.length > 2;
  } catch { return false; }
}

export function SessionRefresh() {
  const started = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (refreshLooping()) { window.location.replace("/login"); return; }
    void refreshAdminSession().then(() => {
      window.location.replace(safeAdminReturnTo(new URLSearchParams(window.location.search).get("returnTo")));
    }).catch((cause: unknown) => {
      if (cause instanceof ApiError && cause.status === 401) {
        expireAdminSession(cause.requestId);
      } else setError(adminErrorMessage(cause));
    });
  }, []);
  return <AuthPanel title="Restoring your session">
    {error ? <div className="stack"><p className="error" role="alert">{error}</p><button className="button primary" onClick={() => window.location.reload()}>Try again</button><Link className="button" href="/login">Return to sign in</Link></div> : <p className="muted" role="status">Checking your secure admin session…</p>}
  </AuthPanel>;
}
