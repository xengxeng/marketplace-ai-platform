import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logError } from "@/lib/observability/log";

const SCOPE = "auth/callback";

const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL ?? "xengco09@gmail.com")
  .trim()
  .toLowerCase();

function failure(origin: string, reason: string) {
  return NextResponse.redirect(`${origin}/auth?error=${reason}`);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return failure(origin, "missing_code");
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    logError(SCOPE, new Error("Supabase is not configured"), { step: "create_client" });
    return failure(origin, "supabase_not_configured");
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    logError(SCOPE, error ?? new Error("code exchange returned no user"), { step: "exchange_code" });
    return failure(origin, "auth_callback_failed");
  }

  const email = data.user.email ?? "";
  const normalizedEmail = email.trim().toLowerCase();
  const resolvedRole = normalizedEmail === SUPER_ADMIN_EMAIL ? "super_admin" : "guest";

  const { error: upsertError } = await supabase.from("profiles").upsert(
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

  // Without a profile row the dashboard cannot resolve a role, so sending the
  // user on as if sign-in succeeded would strand them on a broken dashboard.
  if (upsertError) {
    logError(SCOPE, upsertError, { step: "upsert_profile", userId: data.user.id });
    return failure(origin, "profile_setup_failed");
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
