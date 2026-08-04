import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/responses";
import { guardFailed, requireUser } from "@/lib/api/guards";
import { logActivity } from "@/lib/activity/log";

export async function POST() {
  const guard = await requireUser();

  if (guardFailed(guard)) {
    return guard.response;
  }

  const { supabase, user } = guard;

  const { data: orderId, error } = await supabase.rpc("place_order", {
    p_customer_id: user.id,
    p_reseller_id: null,
  });

  if (error) {
    return apiError(error.message, 400);
  }

  await logActivity(supabase, {
    actorId: user.id,
    action: "order_placed",
    targetType: "order",
    targetId: orderId,
  });

  return NextResponse.json({ orderId });
}
