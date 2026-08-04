import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireRoles } from "@/lib/api/session";
import { logError } from "@/lib/observability/log";
import { withErrorHandling } from "@/lib/api/handler";

const SCOPE = "api/orders";

export const GET = withErrorHandling(SCOPE, async () => {
  const session = await requireRoles(["admin", "super_admin"]);
  if (!session.ok) {
    return session.response;
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("orders")
    .select("id, customer_id, reseller_id, status, total_cents, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    logError(SCOPE, error, { step: "list_orders" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ orders: data ?? [] });
});
