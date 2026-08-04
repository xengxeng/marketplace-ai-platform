import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DEFAULT_ROLE, isSuperAdminEmail } from "@/lib/auth/roles";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createServerSupabaseClient();

    if (supabase) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error && data.user) {
        const email = data.user.email ?? "";

        const { data: existing } = await supabase
          .from("profiles")
          .select("role, is_verified")
          .eq("id", data.user.id)
          .maybeSingle();

        const resolvedRole = isSuperAdminEmail(email) ? "super_admin" : existing?.role ?? DEFAULT_ROLE;

        await supabase.from("profiles").upsert(
          {
            id: data.user.id,
            email,
            full_name: data.user.user_metadata?.full_name ?? email,
            role: resolvedRole,
            is_verified: existing?.is_verified ?? false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );

        return NextResponse.redirect(`${origin}/dashboard`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=auth_callback_failed`);
}
