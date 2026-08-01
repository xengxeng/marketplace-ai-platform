import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL ?? "xengco09@gmail.com")
  .trim()
  .toLowerCase();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email, fullName, role } = body;
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const resolvedRole = normalizedEmail === SUPER_ADMIN_EMAIL ? "super_admin" : role ?? "guest";

    if (!userId || !email) {
      return NextResponse.json({ error: "Missing user info" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    if (!supabase) {
      return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
    }

    const { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
        email,
        full_name: fullName ?? email,
        role: resolvedRole,
        is_verified: false,
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
