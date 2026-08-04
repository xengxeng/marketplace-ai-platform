import { createServerSupabaseClient, type ServerSupabaseClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

type SessionProfile = {
  supabase: ServerSupabaseClient | null;
  user: User | null;
  role: string | null;
};

export async function getSessionProfile(): Promise<SessionProfile> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { supabase: null, user: null, role: null };
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { supabase, user: null, role: null };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).maybeSingle();

  return { supabase, user: userData.user, role: profile?.role ?? "guest" };
}
