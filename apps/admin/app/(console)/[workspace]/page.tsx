import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/auth/server";
import { resources } from "@/features/console/catalog";
import { canVisit } from "@/features/console/access";
import { Workspace } from "@/features/console/workspace";
import { AccessDenied } from "@/features/console/presentation";

export default async function WorkspacePage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const resource = resources.find(r => r.slug === workspace);
  if (!resource) notFound();
  const admin = await requireAdminSession(`/${workspace}`);
  if (!canVisit(admin, resource)) return <AccessDenied />;
  return <Workspace resource={resource} />;
}
