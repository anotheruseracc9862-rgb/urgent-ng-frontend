import Link from "next/link";
export default function NotFound() { return <main className="auth-page"><section className="auth-panel"><h1>Workspace not found</h1><p>This address does not belong to an admin workspace.</p><Link className="button primary" href="/dashboard">Back to overview</Link></section></main>; }
