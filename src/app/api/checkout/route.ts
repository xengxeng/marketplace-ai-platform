import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity/log";
import { withErrorHandling } from "@/lib/api/handler";
import { logError } from "@/lib/observability/log";

const SCOPE = "api/checkout";

export const POST = withErrorHandling(SCOPE, async () => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: orderId, error } = await supabase.rpc("place_order", {
    p_customer_id: userData.user.id,
    p_reseller_id: null,
  });

  if (error) {
    logError(SCOPE, error, { userId: userData.user.id, step: "place_order" });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // The client redirects to /orders/<id>, so an empty id would send the shopper
  // to a "not found" page for an order that may well have been created.
  if (!orderId) {
    logError(SCOPE, new Error("place_order returned no order id"), { userId: userData.user.id });
    return NextResponse.json({ error: "Order could not be confirmed. Please check your orders before retrying." }, { status: 500 });
  }

  await logActivity(supabase, {
    actorId: userData.user.id,
    action: "order_placed",
    targetType: "order",
    targetId: orderId,
  });

  return NextResponse.json({ orderId });
});
