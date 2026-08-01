import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/require-role";
import { logActivity } from "@/lib/activity/log";

const VALID_STATUSES = ["pending", "paid", "fulfilled", "cancelled"];
const TERMINAL_STATUSES = ["fulfilled", "cancelled"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, role } = await getSessionProfile();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!["admin", "super_admin"].includes(role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { status } = await request.json();

  if (!VALID_STATUSES.includes(status)) {
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

  if (TERMINAL_STATUSES.includes(existing.status)) {
    return NextResponse.json({ error: `Order is already ${existing.status} and cannot be changed` }, { status: 409 });
  }

  const { error: updateError } = await supabase.from("orders").update({ status }).eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await logActivity(supabase, {
    actorId: user.id,
    action: "order_status_changed",
    targetType: "order",
    targetId: id,
    metadata: { from: existing.status, to: status },
  });

  if (["fulfilled", "cancelled"].includes(status)) {
    await supabase.rpc("notify", {
      p_recipient_id: existing.customer_id,
      p_title: status === "fulfilled" ? "Order fulfilled" : "Order cancelled",
      p_body:
        status === "fulfilled"
          ? `Your order ${id.slice(0, 8)} has been fulfilled.`
          : `Your order ${id.slice(0, 8)} was cancelled.`,
      p_link: `/orders/${id}`,
    });
  }

  return NextResponse.json({ ok: true });
}
