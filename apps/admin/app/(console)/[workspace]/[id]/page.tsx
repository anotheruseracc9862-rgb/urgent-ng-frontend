import { notFound } from 'next/navigation';
import { requireAdminSession } from '@/lib/auth/server';
import { RecordPage } from '@/features/console/record-page';

export default async function Page({ params }: { params: Promise<{ workspace: string; id: string }> }) {
  const { workspace, id } = await params;
  if (!['users', 'errands'].includes(workspace)) notFound();
  await requireAdminSession(`/${workspace}/${encodeURIComponent(id)}`);
  return <RecordPage key={`${workspace}:${id}`} slug={workspace} id={id} />;
}
