import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logError } from "@/lib/observability/log";

const SCOPE = "auth/require-role";

export type SessionProfile = {
  user: User | null;
  role: string | null;
  /**
   * Set when the session or role could not be determined because of a backend
   * failure. Callers must treat this as "unknown", not as "unauthorized" —
   * otherwise a transient outage looks like a permission denial.
   */
  error: string | null;
};

export async function getSessionProfile(): Promise<SessionProfile> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { user: null, role: null, error: "Supabase is not configured" };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    // A missing/expired session is the normal signed-out path, not a failure.
    if (userError.status === 401 || userError.status === 400) {
      return { user: null, role: null, error: null };
    }

    logError(SCOPE, userError, { step: "get_user" });
    return { user: null, role: null, error: userError.message };
  }

  if (!userData.user) {
    return { user: null, role: null, error: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError) {
    logError(SCOPE, profileError, { step: "fetch_profile", userId: userData.user.id });
    return { user: userData.user, role: null, error: profileError.message };
  }

  return { user: userData.user, role: profile?.role ?? "guest", error: null };
}
