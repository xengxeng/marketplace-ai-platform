import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/responses";
import { guardFailed, requireRole } from "@/lib/api/guards";
import { PLATFORM_ADMIN_ROLES } from "@/lib/auth/roles";
import { logActivity } from "@/lib/activity/log";
import { notify } from "@/lib/notifications/notify";

const VALID_STATUSES = ["pending", "verified", "suspended"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireRole(PLATFORM_ADMIN_ROLES);

  if (guardFailed(guard)) {
    return guard.response;
  }

  const { supabase, user } = guard;
  const { status } = await request.json();

  if (!VALID_STATUSES.includes(status)) {
    return apiError("Invalid status", 400);
  }

  const { data: existing, error: fetchError } = await supabase
    .from("merchants")
    .select("status, owner_id, business_name")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing) {
    return apiError("Merchant not found", 404);
  }

  const { error: updateError } = await supabase.from("merchants").update({ status }).eq("id", id);

  if (updateError) {
    return apiError(updateError.message, 500);
  }

  await logActivity(supabase, {
    actorId: user.id,
    action: "merchant_status_changed",
    targetType: "merchant",
    targetId: id,
    metadata: { from: existing.status, to: status },
  });

  if (status === "verified" || status === "suspended") {
    await notify(supabase, {
      recipientId: existing.owner_id,
      title: status === "verified" ? "Merchant application approved" : "Merchant account suspended",
      body:
        status === "verified"
          ? `${existing.business_name} has been verified. Your products are now visible to shoppers.`
          : `${existing.business_name} has been suspended. Contact support to resolve this.`,
      link: "/dashboard/merchant",
    });
  }

  return NextResponse.json({ ok: true });
}
