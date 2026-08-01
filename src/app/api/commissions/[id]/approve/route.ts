import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/require-role";
import { logActivity } from "@/lib/activity/log";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, role } = await getSessionProfile();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!["admin", "super_admin", "finance_admin"].includes(role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { error } = await supabase.rpc("approve_commission", { p_commission_id: id });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logActivity(supabase, {
    actorId: user.id,
    action: "commission_approved",
    targetType: "commission",
    targetId: id,
  });

  return NextResponse.json({ ok: true });
}
