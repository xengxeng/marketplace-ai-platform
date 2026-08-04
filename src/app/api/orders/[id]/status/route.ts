import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/require-role";
import { logActivity } from "@/lib/activity/log";
import { canTransition, isOrderStatus, isTerminal, ORDER_TRANSITIONS, statusNotification } from "@/lib/orders/status";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, role } = await getSessionProfile();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!["admin", "super_admin"].includes(role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let status: unknown;
  try {
    ({ status } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isOrderStatus(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data: existing, error: fetchError } = await supabase.from("orders").select("status, customer_id").eq("id", id).maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (isTerminal(existing.status)) {
    return NextResponse.json({ error: `Order is already ${existing.status} and cannot be changed` }, { status: 409 });
  }

  if (!canTransition(existing.status, status)) {
    const allowed = isOrderStatus(existing.status) ? ORDER_TRANSITIONS[existing.status].join(", ") : "";
    return NextResponse.json(
      { error: `Cannot move an order from ${existing.status} to ${status}. Allowed: ${allowed || "none"}` },
      { status: 409 },
    );
  }

  const { error: updateError } = await supabase.from("orders").update({ status }).eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Audit trail is best-effort in the same spirit as logActivity: the status
  // change itself has already committed, so a history write failure must not
  // turn a successful transition into a 500.
  await supabase.from("order_status_history").insert({
    order_id: id,
    from_status: existing.status,
    to_status: status,
    changed_by: user.id,
  });

  await logActivity(supabase, {
    actorId: user.id,
    action: "order_status_changed",
    targetType: "order",
    targetId: id,
    metadata: { from: existing.status, to: status },
  });

  const notification = statusNotification(status, id);
  if (notification) {
    await supabase.rpc("notify", {
      p_recipient_id: existing.customer_id,
      p_title: notification.title,
      p_body: notification.body,
      p_link: `/orders/${id}`,
    });
  }

  return NextResponse.json({ ok: true, status });
}
