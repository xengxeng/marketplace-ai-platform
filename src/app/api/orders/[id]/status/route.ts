import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireRoles } from "@/lib/api/session";
import { logActivity } from "@/lib/activity/log";
import { readJsonBody } from "@/lib/api/json";
import { withErrorHandling } from "@/lib/api/handler";
import { logError } from "@/lib/observability/log";

const SCOPE = "api/orders/[id]/status";
const VALID_STATUSES = ["pending", "paid", "fulfilled", "cancelled"];
const TERMINAL_STATUSES = ["fulfilled", "cancelled"];

export const PATCH = withErrorHandling(SCOPE, async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const session = await requireRoles(["admin", "super_admin"]);
  if (!session.ok) {
    return session.response;
  }

  const parsed = await readJsonBody<{ status?: unknown }>(request, SCOPE);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { status } = parsed.data;

  if (typeof status !== "string" || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data: existing, error: fetchError } = await supabase.from("orders").select("status, customer_id").eq("id", id).maybeSingle();

  if (fetchError) {
    logError(SCOPE, fetchError, { orderId: id, step: "fetch_order" });
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (TERMINAL_STATUSES.includes(existing.status)) {
    return NextResponse.json({ error: `Order is already ${existing.status} and cannot be changed` }, { status: 409 });
  }

  const { error: updateError } = await supabase.from("orders").update({ status }).eq("id", id);

  if (updateError) {
    logError(SCOPE, updateError, { orderId: id, step: "update_status" });
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await logActivity(supabase, {
    actorId: session.user.id,
    action: "order_status_changed",
    targetType: "order",
    targetId: id,
    metadata: { from: existing.status, to: status },
  });

  if (TERMINAL_STATUSES.includes(status)) {
    const { error: notifyError } = await supabase.rpc("notify", {
      p_recipient_id: existing.customer_id,
      p_title: status === "fulfilled" ? "Order fulfilled" : "Order cancelled",
      p_body:
        status === "fulfilled"
          ? `Your order ${id.slice(0, 8)} has been fulfilled.`
          : `Your order ${id.slice(0, 8)} was cancelled.`,
      p_link: `/orders/${id}`,
    });

    // The status change already committed, so a notification failure must not
    // fail the request — but it must be visible in the logs.
    if (notifyError) {
      logError(SCOPE, notifyError, { orderId: id, step: "notify" });
    }
  }

  return NextResponse.json({ ok: true });
});
