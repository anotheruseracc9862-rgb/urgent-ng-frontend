import { ShareManagementPage } from '@/features/safety/share/share-management-page';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ShareManagementPage key={id} errandId={id} />;
}
