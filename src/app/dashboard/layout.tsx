import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getSessionProfile } from "@/lib/auth/require-role";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { user } = await getSessionProfile();

  if (!user) {
    redirect("/auth");
  }

  const supabase = await createServerSupabaseClient();
  const { data: profile } = supabase
    ? await supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle()
    : { data: null };

  const displayName = profile?.full_name?.trim() || (profile?.email ?? user.email ?? "Account").split("@")[0];

  return <DashboardShell displayName={displayName}>{children}</DashboardShell>;
}
