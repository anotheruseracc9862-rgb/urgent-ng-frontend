import { requireAdminSession } from "@/lib/auth/server";
import { ConsoleShell } from "@/features/console/shell";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminSession();
  return <ConsoleShell initialAdmin={admin}>{children}</ConsoleShell>;
}
