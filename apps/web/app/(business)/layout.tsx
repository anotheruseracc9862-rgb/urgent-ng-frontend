import { Sidebar } from '@/components/shell/sidebar';
import { Topbar } from '@/components/shell/topbar';

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: Get actual mode from session
  const mode = 'REQUESTER' as 'REQUESTER' | 'RUNNER';

  return (
    <div className="grid grid-cols-[276px_minmax(0,1fr)] gap-4 min-h-screen p-4">
      <Sidebar mode={mode} />
      <main className="flex flex-col gap-4 min-w-0">
        <Topbar mode={mode} />
        <div className="pb-10">{children}</div>
      </main>
    </div>
  );
}
