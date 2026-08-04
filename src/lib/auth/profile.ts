import type { ServerSupabaseClient } from "@/lib/supabase/server";

export const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL ?? "xengco09@gmail.com").trim().toLowerCase();

export function resolveRole(email: unknown, fallbackRole = "guest") {
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  return normalizedEmail === SUPER_ADMIN_EMAIL ? "super_admin" : fallbackRole;
}

export async function upsertProfile(
  supabase: ServerSupabaseClient,
  profile: { userId: string; email: string; fullName?: string | null; role: string },
) {
  return supabase.from("profiles").upsert(
    {
      id: profile.userId,
      email: profile.email,
      full_name: profile.fullName ?? profile.email,
      role: profile.role,
      is_verified: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
}
