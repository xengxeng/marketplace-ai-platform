import type { SupabaseClient } from "@supabase/supabase-js";

export type Reseller = {
  id: string;
  user_id: string;
  full_name: string;
  phone_number: string;
  verification_status: "unverified" | "pending" | "approved" | "rejected" | "resubmission_required";
  review_note: string | null;
};

export async function getResellerForUser(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("resellers")
    .select("id, user_id, full_name, phone_number, verification_status, review_note")
    .eq("user_id", userId)
    .maybeSingle();

  return (data as Reseller | null) ?? null;
}
