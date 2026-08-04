import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/responses";
import { guardFailed, requireRole } from "@/lib/api/guards";
import { PLATFORM_ADMIN_ROLES } from "@/lib/auth/roles";
import { logActivity } from "@/lib/activity/log";
import { notify } from "@/lib/notifications/notify";
import { shortId } from "@/lib/format";

const VALID_STATUSES = ["pending", "paid", "fulfilled", "cancelled"];
const TERMINAL_STATUSES = ["fulfilled", "cancelled"];

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
    .from("orders")
    .select("status, customer_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing) {
    return apiError("Order not found", 404);
  }

  if (TERMINAL_STATUSES.includes(existing.status)) {
    return apiError(`Order is already ${existing.status} and cannot be changed`, 409);
  }

  const { error: updateError } = await supabase.from("orders").update({ status }).eq("id", id);

  if (updateError) {
    return apiError(updateError.message, 500);
  }

  await logActivity(supabase, {
    actorId: user.id,
    action: "order_status_changed",
    targetType: "order",
    targetId: id,
    metadata: { from: existing.status, to: status },
  });

  if (TERMINAL_STATUSES.includes(status)) {
    await notify(supabase, {
      recipientId: existing.customer_id,
      title: status === "fulfilled" ? "Order fulfilled" : "Order cancelled",
      body:
        status === "fulfilled"
          ? `Your order ${shortId(id)} has been fulfilled.`
          : `Your order ${shortId(id)} was cancelled.`,
      link: `/orders/${id}`,
    });
  }

  return NextResponse.json({ ok: true });
}
