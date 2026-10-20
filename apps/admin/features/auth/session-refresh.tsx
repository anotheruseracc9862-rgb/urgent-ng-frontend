"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { adminErrorMessage, expireAdminSession, refreshAdminSession } from "../../lib/api/client";
import { ApiError } from "@urgent/api-client";
import { safeAdminReturnTo } from "../../lib/auth/shared";
import { AuthPanel } from "./auth-panel";

export function SessionRefresh() {
  const started = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
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
