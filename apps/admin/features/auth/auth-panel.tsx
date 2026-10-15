import type { ReactNode } from "react";
import Link from "next/link";

export function AuthPanel({ title, children }: { title: string; children: ReactNode }) {
  return <main className="auth-page"><section className="auth-panel" aria-labelledby="auth-title">
    <Link className="brand" href="/login"><span className="brand-mark" aria-hidden="true">U</span> Urgent.ng</Link>
    <p className="eyebrow">ADMIN CONSOLE</p>
    <h1 id="auth-title">{title}</h1>
    {children}
  </section></main>;
}
