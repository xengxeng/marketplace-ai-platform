import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DEFAULT_ROLE, isSuperAdminEmail } from "@/lib/auth/roles";

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();

    if (!supabase) {
      return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const user = userData.user;
    const email = user.email ?? "";

    const { data: existing } = await supabase
      .from("profiles")
      .select("role, is_verified")
      .eq("id", user.id)
      .maybeSingle();

    const resolvedRole = isSuperAdminEmail(email) ? "super_admin" : existing?.role ?? DEFAULT_ROLE;

    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email,
        full_name: user.user_metadata?.full_name ?? email,
        role: resolvedRole,
        is_verified: existing?.is_verified ?? false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
