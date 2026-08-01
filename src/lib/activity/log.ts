import type { SupabaseClient } from "@supabase/supabase-js";

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
  // Best-effort: activity logging should never block or fail the primary action.
  try {
    await supabase.from("activity_logs").insert({
      actor_id: params.actorId,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId ?? null,
      metadata: params.metadata ?? {},
    });
  } catch {
    // swallow - logging failures must not affect the caller
  }
}
