import { notFound } from 'next/navigation';
import { requireAdminSession } from '@/lib/auth/server';
import { RecordPage } from '@/features/console/record-page';

export default async function Page({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  if (!['disputes', 'reports'].includes(kind)) notFound();
  await requireAdminSession(`/cases/${kind}/${encodeURIComponent(id)}`);
  return <RecordPage key={`${kind}:${id}`} slug={kind} id={id} />;
}
