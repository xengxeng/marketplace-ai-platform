import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/require-role";
import { logActivity } from "@/lib/activity/log";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, role } = await getSessionProfile();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Admin/super_admin roles are handled by transition_order's internal auth.
  // Merchants are also allowed — transition_order validates their ownership.
  // Other roles (guest, customer, reseller) are blocked by the function.
  if (role === "guest") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { status, note, tracking_number, carrier } = body;

  if (!status) {
    return NextResponse.json({ error: "Status is required" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data: result, error } = await supabase.rpc("transition_order", {
    p_order_id: id,
    p_to_status: status,
    p_note: note ?? null,
    p_tracking_number: tracking_number ?? null,
    p_carrier: carrier ?? null,
  });

  if (error) {
    const message = error.message;
    // Map Postgres exception codes to user-friendly messages
    if (message.includes("ORDER_NOT_FOUND")) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (message.includes("INVALID_TRANSITION")) {
      return NextResponse.json({ error: "Invalid status transition" }, { status: 409 });
    }
    if (message.includes("TRANSITION_NOT_ALLOWED_FOR_ROLE")) {
      return NextResponse.json({ error: "You are not allowed to perform this transition" }, { status: 403 });
    }
    if (message.includes("MISSING_TRACKING_INFO")) {
      return NextResponse.json({ error: "Tracking number and carrier are required when marking an order shipped" }, { status: 400 });
    }
    if (message.includes("not authorized")) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Log the activity for audit trail
  await logActivity(supabase, {
    actorId: user.id,
    action: "order_status_changed",
    targetType: "order",
    targetId: id,
    metadata: { from: result.from_status, to: result.to_status },
  });

  return NextResponse.json({ ok: true, transition: result });
}
