import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveRole, upsertProfile } from "@/lib/auth/profile";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createServerSupabaseClient();

    if (supabase) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error && data.user) {
        const email = data.user.email ?? "";

        await upsertProfile(supabase, {
          userId: data.user.id,
          email,
          fullName: data.user.user_metadata?.full_name,
          role: resolveRole(email),
        });

        return NextResponse.redirect(`${origin}/dashboard`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=auth_callback_failed`);
}
