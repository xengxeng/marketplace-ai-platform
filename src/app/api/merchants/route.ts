import { listResponse } from "@/lib/api/responses";
import { guardFailed, requireRole } from "@/lib/api/guards";
import { PLATFORM_ADMIN_ROLES } from "@/lib/auth/roles";

export async function GET() {
  const guard = await requireRole(PLATFORM_ADMIN_ROLES);

  if (guardFailed(guard)) {
    return guard.response;
  }

  return listResponse(
    "merchants",
    await guard.supabase
      .from("merchants")
      .select("id, owner_id, business_name, status, created_at")
      .order("created_at", { ascending: false }),
  );
}
