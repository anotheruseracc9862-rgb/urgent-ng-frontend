"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { adminApi, adminErrorMessage } from "../../lib/api/client";
import { PasswordInput } from "./password-input";
import { AuthPanel } from "./auth-panel";

export function AcceptInviteForm() {
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const captured = useRef(false);
  useEffect(() => {
    if (captured.current) return;
    captured.current = true;
    const url = new URL(window.location.href);
    const fragment = url.hash.slice(1);
    const value = new URLSearchParams(fragment).get("token") ?? (fragment && !fragment.includes("=") ? fragment : null) ?? url.searchParams.get("token") ?? "";
    // Keep the one-time token in component memory only, including legacy query links.
    window.history.replaceState(null, "", url.pathname);
    queueMicrotask(() => { setToken(value); setReady(true); });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    if (values.get("password") !== values.get("confirm")) { setError("Passwords do not match."); return; }
    setBusy(true); setError("");
    try {
      await adminApi("/auth/accept-invite", { method: "POST", noRefresh: true, body: { token, password: String(values.get("password")) } });
      form.reset(); setToken(""); setDone(true);
    } catch (cause) { setError(adminErrorMessage(cause)); }
    finally { setBusy(false); }
  }

  return <AuthPanel title={done ? "Your account is ready" : "Accept your invitation"}>
    {done ? <div className="stack"><p className="notice">Password set. Sign in to set up your authenticator and finish securing your account.</p><Link className="button primary" href="/login">Continue to sign in</Link></div> : !ready ? <p role="status">Reading invitation…</p> : !token ? <p className="error" role="alert">This invitation has no token. Ask your administrator for a new invitation.</p> : <form className="stack" method="post" action="/accept-invite" onSubmit={submit} aria-busy={busy}>
      <p className="muted">Choose a password with at least 12 characters. Authenticator setup follows at sign-in.</p>
      <label className="field">New password<PasswordInput name="password" autoComplete="new-password" minLength={12} required disabled={busy} /></label>
      <label className="field">Confirm password<PasswordInput name="confirm" autoComplete="new-password" minLength={12} required disabled={busy} /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="button primary" disabled={busy || !ready}>{busy ? "Setting password…" : "Accept invitation"}</button>
    </form>}
  </AuthPanel>;
}
