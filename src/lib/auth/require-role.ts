import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getSessionProfile() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { user: null, role: null as string | null };
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { user: null, role: null as string | null };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).maybeSingle();

  return { user: userData.user, role: profile?.role ?? "guest" };
}
