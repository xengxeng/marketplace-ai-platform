import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getSessionProfile } from "@/lib/auth/require-role";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { user } = await getSessionProfile();

  if (!user) {
    redirect("/auth");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
