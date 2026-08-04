import { listResponse } from "@/lib/api/responses";
import { guardFailed, requireRole } from "@/lib/api/guards";
import { FINANCE_ROLES } from "@/lib/auth/roles";

export async function GET() {
  const guard = await requireRole(FINANCE_ROLES);

  if (guardFailed(guard)) {
    return guard.response;
  }

  return listResponse(
    "commissions",
    await guard.supabase
      .from("commissions")
      .select("id, order_id, reseller_id, amount_cents, status, created_at")
      .order("created_at", { ascending: false }),
  );
}
