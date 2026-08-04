import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/responses";
import { guardFailed, requireRole } from "@/lib/api/guards";
import { FINANCE_ROLES } from "@/lib/auth/roles";
import { logActivity } from "@/lib/activity/log";
import { notify } from "@/lib/notifications/notify";
import { formatPeso } from "@/lib/format";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireRole(FINANCE_ROLES);

  if (guardFailed(guard)) {
    return guard.response;
  }

  const { supabase, user } = guard;

  const { data: commission } = await supabase
    .from("commissions")
    .select("reseller_id, amount_cents")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.rpc("approve_commission", { p_commission_id: id });

  if (error) {
    return apiError(error.message, 400);
  }

  await logActivity(supabase, {
    actorId: user.id,
    action: "commission_approved",
    targetType: "commission",
    targetId: id,
  });

  if (commission) {
    await notify(supabase, {
      recipientId: commission.reseller_id,
      title: "Commission approved",
      body: `Your commission of ${formatPeso(commission.amount_cents)} has been approved and credited to your wallet.`,
      link: "/dashboard/finance",
    });
  }

  return NextResponse.json({ ok: true });
}
