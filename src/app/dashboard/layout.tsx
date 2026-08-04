import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DataLoadError } from "@/components/dashboard/data-load-error";
import { getSessionProfile } from "@/lib/auth/require-role";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, error } = await getSessionProfile();

  // Redirecting on a backend failure would bounce a signed-in user to the
  // sign-in page as if their session were invalid.
  if (error) {
    return (
      <DashboardShell>
        <DataLoadError title="We couldn't verify your session" message={error} />
      </DashboardShell>
    );
  }

  if (!user) {
    redirect("/auth");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
