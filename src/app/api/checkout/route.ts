import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity/log";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Reseller attribution and the customer gate are resolved inside place_order
  // from the caller's own profile, so nothing about them is client-supplied.
  const { data: orderId, error } = await supabase.rpc("place_order", {
    p_customer_id: userData.user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logActivity(supabase, {
    actorId: userData.user.id,
    action: "order_placed",
    targetType: "order",
    targetId: orderId,
  });

  return NextResponse.json({ orderId });
}
