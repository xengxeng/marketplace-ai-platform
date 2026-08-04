import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { withErrorHandling } from "@/lib/api/handler";
import { logError } from "@/lib/observability/log";

const SCOPE = "api/notifications";

export const GET = withErrorHandling(SCOPE, async () => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, body, link, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    logError(SCOPE, error, { step: "list_notifications" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notifications: data ?? [] });
});
