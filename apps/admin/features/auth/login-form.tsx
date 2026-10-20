"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Input } from "@urgent/ui";
import { QRCodeSVG } from "qrcode.react";
import type { components } from "@urgent/api-client";
import { adminApi, adminErrorMessage } from "../../lib/api/client";
import { ADMIN_IDLE_KEY, DEFAULT_IDLE_SECONDS, safeAdminReturnTo } from "../../lib/auth/shared";
import { PasswordInput } from "./password-input";
import { AuthPanel } from "./auth-panel";

type MfaStep = components["schemas"]["AdminLoginStepDto"];
type Session = components["schemas"]["AdminSessionResultDto"];
/** With ADMIN_MFA_REQUIRED=false on the API, the password step answers with the session itself. */
type LoginResult = MfaStep | (Session & { status: "AUTHENTICATED" });
type LoginStep = MfaStep;
type Enrolment = components["schemas"]["MfaEnrolmentDto"];

export function LoginForm({ expired = false }: { expired?: boolean }) {
  const [step, setStep] = useState<LoginStep | null>(null);
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showExpired, setShowExpired] = useState(expired);

  useEffect(() => {
    if (!expired) return;
    const timer = window.setTimeout(() => setShowExpired(false), 6000);
    return () => window.clearTimeout(timer);
  }, [expired]);

  function finish(session: Session) {
    const seconds = Math.min(DEFAULT_IDLE_SECONDS, session.expiresIn);
    try { localStorage.setItem(ADMIN_IDLE_KEY, JSON.stringify({ adminId: session.admin.id, seconds, deadline: Date.now() + seconds * 1000 })); } catch { /* Storage may be disabled; the console still locks in memory. */ }
    setStep(null); setEnrolment(null);
    window.location.replace(safeAdminReturnTo(new URLSearchParams(window.location.search).get("returnTo")));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setError(""); setBusy(true);
    try {
      if (!step) {
        const next = await adminApi<LoginResult>("/auth/login", { method: "POST", noRefresh: true, body: {
          email: String(values.get("email")).trim(), password: String(values.get("password")),
        } });
        form.reset();
        if (next.status === "AUTHENTICATED") return finish(next);
        setStep(next);
        if (next.status === "MFA_ENROLMENT_REQUIRED") {
          setEnrolment(await adminApi<Enrolment>("/auth/mfa/enrol", { method: "POST", noRefresh: true, body: { mfaToken: next.mfaToken } }));
        }
      } else if (step.status === "MFA_ENROLMENT_REQUIRED" && !enrolment) {
        setEnrolment(await adminApi<Enrolment>("/auth/mfa/enrol", { method: "POST", noRefresh: true, body: { mfaToken: step.mfaToken } }));
      } else {
        finish(await adminApi<Session>("/auth/mfa/verify", { method: "POST", noRefresh: true, body: { mfaToken: step.mfaToken, code: String(values.get("code")) } }));
      }
    } catch (cause) { setError(adminErrorMessage(cause)); }
    finally { setBusy(false); }
  }

  return <AuthPanel title={step ? "Verify your identity" : "Sign in to your workspace"}>
    <p className="muted">Invitation-only access. Use your admin account, not your customer account.</p>
    {showExpired && <p className="notice" role="status">Your session expired. Please sign in again.</p>}
    <form className="stack" onSubmit={submit} aria-busy={busy}>
      {!step ? <>
        <label className="field">Email<Input name="email" type="email" autoComplete="username" maxLength={255} required disabled={busy} /></label>
        <label className="field">Password<PasswordInput name="password" autoComplete="current-password" maxLength={128} required disabled={busy} /></label>
      </> : <>
        {step.status === "MFA_ENROLMENT_REQUIRED" && <div className="notice stack">
          <p>Add an account in your authenticator app using this setup key. Never share it.</p>
          {enrolment && <><QRCodeSVG value={enrolment.otpauthUri} size={180} marginSize={3} title="Scan in your authenticator app" /><code className="mono" style={{ overflowWrap: "anywhere" }}>{enrolment.secret}</code>
            <a className="button" href={enrolment.otpauthUri.startsWith("otpauth://") ? enrolment.otpauthUri : undefined}>Open authenticator app</a>
          </>}
        </div>}
        {(step.status === "MFA_REQUIRED" || enrolment) && <label className="field">6-digit authenticator code<Input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required disabled={busy} /></label>}
      </>}
      {error && <p className="error" role="alert">{error}</p>}
      <button className="button primary" disabled={busy}>{busy ? "Please wait…" : !step ? "Continue" : step.status === "MFA_ENROLMENT_REQUIRED" && !enrolment ? "Load setup key" : "Verify and sign in"}</button>
      {step && <button className="button" type="button" disabled={busy} onClick={() => { setStep(null); setEnrolment(null); setError(""); }}>Start again</button>}
    </form>
    <p className="muted">Need access? Ask your administrator for an invitation.</p>
  </AuthPanel>;
}
