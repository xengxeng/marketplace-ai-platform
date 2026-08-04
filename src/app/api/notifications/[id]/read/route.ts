import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/responses";
import { guardFailed, requireUser } from "@/lib/api/guards";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireUser();

  if (guardFailed(guard)) {
    return guard.response;
  }

  const { error } = await guard.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return apiError(error.message, 500);
  }

  return NextResponse.json({ ok: true });
}
