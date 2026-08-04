import { listResponse } from "@/lib/api/responses";
import { guardFailed, requireRole } from "@/lib/api/guards";
import { PLATFORM_ADMIN_ROLES } from "@/lib/auth/roles";

export async function GET() {
  const guard = await requireRole(PLATFORM_ADMIN_ROLES);

  if (guardFailed(guard)) {
    return guard.response;
  }

  return listResponse(
    "orders",
    await guard.supabase
      .from("orders")
      .select("id, customer_id, reseller_id, status, total_cents, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  );
}
