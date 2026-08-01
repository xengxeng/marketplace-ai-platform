import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL ?? "xengco09@gmail.com")
  .trim()
  .toLowerCase();

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createServerSupabaseClient();

    if (supabase) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error && data.user) {
        const email = data.user.email ?? "";
        const normalizedEmail = email.trim().toLowerCase();
        const resolvedRole = normalizedEmail === SUPER_ADMIN_EMAIL ? "super_admin" : "guest";

        await supabase.from("profiles").upsert(
          {
            id: data.user.id,
            email,
            full_name: data.user.user_metadata?.full_name ?? email,
            role: resolvedRole,
            is_verified: false,
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
