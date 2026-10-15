"use client";
export default function ConsoleError({ reset }: { reset: () => void }) {
  return <section className="empty-state"><h1>Workspace unavailable</h1><p>The console could not load this workspace. Your changes have not been retried.</p><button className="button" onClick={reset}>Try again</button></section>;
}
