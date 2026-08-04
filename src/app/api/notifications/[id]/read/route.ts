import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { withErrorHandling } from "@/lib/api/handler";
import { logError } from "@/lib/observability/log";

const SCOPE = "api/notifications/[id]/read";

export const PATCH = withErrorHandling(SCOPE, async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);

  if (error) {
    logError(SCOPE, error, { notificationId: id, step: "mark_read" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
});
