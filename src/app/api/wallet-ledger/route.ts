import { listResponse } from "@/lib/api/responses";
import { guardFailed, requireRole } from "@/lib/api/guards";
import { FINANCE_ROLES } from "@/lib/auth/roles";

export async function GET() {
  const guard = await requireRole(FINANCE_ROLES);

  if (guardFailed(guard)) {
    return guard.response;
  }

  return listResponse(
    "entries",
    await guard.supabase
      .from("wallet_ledger")
      .select("id, profile_id, entry_type, amount_cents, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  );
}
