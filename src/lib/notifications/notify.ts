import type { ServerSupabaseClient } from "@/lib/supabase/server";

export async function notify(
  supabase: ServerSupabaseClient,
  notification: { recipientId: string; title: string; body: string; link?: string },
) {
  return supabase.rpc("notify", {
    p_recipient_id: notification.recipientId,
    p_title: notification.title,
    p_body: notification.body,
    p_link: notification.link ?? null,
  });
}
