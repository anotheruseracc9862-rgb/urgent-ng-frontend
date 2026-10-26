import { redirect } from 'next/navigation';

/** The "posted" screen is gone: posting goes straight to the errand. Old links and bookmarks still land there. */
export default async function ErrandPublishedRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/errands/${encodeURIComponent(id)}`);
}
