import type { SupabaseClient } from "@supabase/supabase-js";

export type MerchantContext = { id: string; status: string };

/**
 * Resolves the merchant record owned by `ownerId`. Returns null when the user
 * has no merchant application yet.
 */
export async function getOwnedMerchant(supabase: SupabaseClient, ownerId: string) {
  const { data } = await supabase.from("merchants").select("id, status").eq("owner_id", ownerId).maybeSingle();

  return (data as MerchantContext | null) ?? null;
}

/**
 * Only a verified merchant may expose products to shoppers; pending or
 * suspended merchants can still work on drafts.
 */
export function canPublish(merchant: MerchantContext) {
  return merchant.status === "verified";
}
