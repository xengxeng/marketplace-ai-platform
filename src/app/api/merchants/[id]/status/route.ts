import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireRoles } from "@/lib/api/session";
import { logActivity } from "@/lib/activity/log";
import { readJsonBody } from "@/lib/api/json";
import { withErrorHandling } from "@/lib/api/handler";
import { logError } from "@/lib/observability/log";

const SCOPE = "api/merchants/[id]/status";
const VALID_STATUSES = ["pending", "verified", "suspended"];

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

  const { data: existing, error: fetchError } = await supabase
    .from("merchants")
    .select("status, owner_id, business_name")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    logError(SCOPE, fetchError, { merchantId: id, step: "fetch_merchant" });
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  const { error: updateError } = await supabase.from("merchants").update({ status }).eq("id", id);

  if (updateError) {
    logError(SCOPE, updateError, { merchantId: id, step: "update_status" });
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await logActivity(supabase, {
    actorId: session.user.id,
    action: "merchant_status_changed",
    targetType: "merchant",
    targetId: id,
    metadata: { from: existing.status, to: status },
  });

  if (status === "verified" || status === "suspended") {
    const { error: notifyError } = await supabase.rpc("notify", {
      p_recipient_id: existing.owner_id,
      p_title: status === "verified" ? "Merchant application approved" : "Merchant account suspended",
      p_body:
        status === "verified"
          ? `${existing.business_name} has been verified. Your products are now visible to shoppers.`
          : `${existing.business_name} has been suspended. Contact support to resolve this.`,
      p_link: "/dashboard/merchant",
    });

    // The status change already committed, so a notification failure must not
    // fail the request — but it must be visible in the logs.
    if (notifyError) {
      logError(SCOPE, notifyError, { merchantId: id, step: "notify" });
    }
  }

  return NextResponse.json({ ok: true });
});
