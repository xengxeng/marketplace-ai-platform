import { listResponse } from "@/lib/api/responses";
import { guardFailed, requireUser } from "@/lib/api/guards";

export async function GET() {
  const guard = await requireUser();

  if (guardFailed(guard)) {
    return guard.response;
  }

  return listResponse(
    "notifications",
    await guard.supabase
      .from("notifications")
      .select("id, title, body, link, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  );
}
