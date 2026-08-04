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

  // Sign-up seeds `full_name` with the email address, so an email-shaped name
  // is narrowed to its local part rather than shown in full.
  const rawName = profile?.full_name?.trim() || profile?.email || user.email || "Account";
  const displayName = rawName.split("@")[0];

  return <DashboardShell displayName={displayName}>{children}</DashboardShell>;
}
