import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { readJsonBody } from "@/lib/api/json";
import { withErrorHandling } from "@/lib/api/handler";
import { logError } from "@/lib/observability/log";

const SCOPE = "api/auth/profile";

const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL ?? "xengco09@gmail.com")
  .trim()
  .toLowerCase();

export const POST = withErrorHandling(SCOPE, async (request: Request) => {
  const parsed = await readJsonBody<{ userId?: unknown; email?: unknown; fullName?: unknown; role?: unknown }>(
    request,
    SCOPE,
  );
  if (!parsed.ok) {
    return parsed.response;
  }

  const { userId, email, fullName, role } = parsed.data;

  if (typeof userId !== "string" || !userId || typeof email !== "string" || !email) {
    return NextResponse.json({ error: "Missing user info" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const resolvedRole = normalizedEmail === SUPER_ADMIN_EMAIL ? "super_admin" : typeof role === "string" ? role : "guest";

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email,
      full_name: typeof fullName === "string" && fullName ? fullName : email,
      role: resolvedRole,
      is_verified: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    logError(SCOPE, error, { userId, step: "upsert_profile" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
});
