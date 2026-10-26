import { notFound, redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth/server";
import { resources } from "@/features/console/catalog";
import { detailLocation, resourceLocation, workspaces } from "@/features/console/navigation";
import { Workbench } from "@/features/console/workbench";

export default async function WorkspacePage({ params, searchParams }: { params: Promise<{ workspace: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { workspace } = await params;
  await requireAdminSession(`/${workspace}`);
  const query = await searchParams;
  const definition = workspaces.find(w => w.slug === workspace);
  const record = typeof query.record === 'string' ? query.record : undefined;
  if (record && ['users', 'errands'].includes(workspace)) redirect(detailLocation(workspace, record)!);
  if (definition) return <Workbench workspace={definition} />;
  const resource = resources.find(r => r.slug === workspace);
  if (!resource) notFound();
  if (record && detailLocation(workspace, record)) redirect(detailLocation(workspace, record)!);
  // Preserve supported legacy state, but do not echo contact searches into browser history.
  const state = Object.fromEntries(Object.entries(query).filter(([key, value]) => !['q', 'tab', 'view'].includes(key) && typeof value === 'string')) as Record<string, string>;
  redirect(resourceLocation(workspace, state));
}
