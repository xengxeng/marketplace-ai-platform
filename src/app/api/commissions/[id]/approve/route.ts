import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireRoles } from "@/lib/api/session";
import { logActivity } from "@/lib/activity/log";
import { logError } from "@/lib/observability/log";
import { withErrorHandling } from "@/lib/api/handler";

const SCOPE = "api/commissions/[id]/approve";

export const POST = withErrorHandling(SCOPE, async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const session = await requireRoles(["admin", "super_admin", "finance_admin"]);
  if (!session.ok) {
    return session.response;
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data: commission, error: fetchError } = await supabase
    .from("commissions")
    .select("reseller_id, amount_cents")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    logError(SCOPE, fetchError, { commissionId: id, step: "fetch_commission" });
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!commission) {
    return NextResponse.json({ error: "Commission not found" }, { status: 404 });
  }

  const { error } = await supabase.rpc("approve_commission", { p_commission_id: id });

  if (error) {
    logError(SCOPE, error, { commissionId: id, step: "approve_commission" });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logActivity(supabase, {
    actorId: session.user.id,
    action: "commission_approved",
    targetType: "commission",
    targetId: id,
  });

  const { error: notifyError } = await supabase.rpc("notify", {
    p_recipient_id: commission.reseller_id,
    p_title: "Commission approved",
    p_body: `Your commission of ₱${(commission.amount_cents / 100).toFixed(2)} has been approved and credited to your wallet.`,
    p_link: "/dashboard/finance",
  });

  // The approval already committed, so a notification failure must not fail the
  // request — but it must be visible in the logs.
  if (notifyError) {
    logError(SCOPE, notifyError, { commissionId: id, step: "notify" });
  }

  return NextResponse.json({ ok: true });
});
