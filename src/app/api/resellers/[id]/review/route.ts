import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/require-role";
import { logActivity } from "@/lib/activity/log";

const VALID_STATUSES = ["approved", "rejected", "resubmission_required"];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, role } = await getSessionProfile();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!["admin", "super_admin"].includes(role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { status, note } = await request.json();

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (status !== "approved" && (typeof note !== "string" || note.trim().length === 0)) {
    return NextResponse.json({ error: "A review note is required to reject or request resubmission" }, { status: 422 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { error } = await supabase.rpc("review_reseller", {
    p_reseller_id: id,
    p_status: status,
    p_note: typeof note === "string" && note.trim() ? note.trim() : null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logActivity(supabase, {
    actorId: user.id,
    action: "reseller_status_changed",
    targetType: "reseller",
    targetId: id,
    metadata: { to: status },
  });

  return NextResponse.json({ ok: true });
}
