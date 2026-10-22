import { requireAdminSession } from '@/lib/auth/server';
import { RecordPage } from '@/features/console/record-page';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdminSession(`/billing/orders/${encodeURIComponent(id)}`);
  return <RecordPage key={id} slug="orders" id={id} />;
}
