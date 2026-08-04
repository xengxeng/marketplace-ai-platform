import type { SupabaseClient } from "@supabase/supabase-js";
import { logError } from "@/lib/observability/log";

const SCOPE = "activity/log";

export async function logActivity(
  supabase: SupabaseClient,
  params: {
    actorId: string;
    action: string;
    targetType: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  // Best-effort: activity logging must never block or fail the primary action,
  // but a dropped audit entry still has to leave a trace in the server logs.
  try {
    const { error } = await supabase.from("activity_logs").insert({
      actor_id: params.actorId,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId ?? null,
      metadata: params.metadata ?? {},
    });

    if (error) {
      logError(SCOPE, error, { action: params.action, targetType: params.targetType, targetId: params.targetId });
    }
  } catch (error) {
    logError(SCOPE, error, { action: params.action, targetType: params.targetType, targetId: params.targetId });
  }
}
