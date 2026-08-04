import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity/log";
import { firstIssue, toProductRow, updateProductSchema } from "@/lib/products/input";
import type { SupabaseClient } from "@supabase/supabase-js";
import { canPublish, getOwnedMerchant, type MerchantContext } from "@/lib/products/merchant";

const PRODUCT_COLUMNS = "id, name, description, category, image_url, price_cents, stock_int, status, created_at";

type OwnedProduct = {
  ok: true;
  supabase: SupabaseClient;
  userId: string;
  merchant: MerchantContext;
  product: { id: string; merchant_id: string; status: string };
};

/**
 * Resolves the signed-in user's merchant and asserts the product belongs to it,
 * so a merchant can never mutate someone else's catalog (RLS enforces this too;
 * this makes the failure a clean 403/404 instead of a silent no-op).
 */
async function requireOwnedProduct(id: string): Promise<OwnedProduct | { ok: false; response: NextResponse }> {
  const deny = (error: string, status: number) => ({ ok: false as const, response: NextResponse.json({ error }, { status }) });

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return deny("Supabase is not configured", 500);
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return deny("Not signed in", 401);
  }

  const merchant = await getOwnedMerchant(supabase, userData.user.id);
  if (!merchant) {
    return deny("No merchant application found", 403);
  }

  const { data: product } = await supabase.from("products").select("id, merchant_id, status").eq("id", id).maybeSingle();

  if (!product) {
    return deny("Product not found", 404);
  }

  if (product.merchant_id !== merchant.id) {
    return deny("Forbidden", 403);
  }

  return { ok: true, supabase, userId: userData.user.id, merchant, product };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }

  const context = await requireOwnedProduct(id);
  if (!context.ok) {
    return context.response;
  }

  const { supabase, userId, merchant, product } = context;

  if (parsed.data.status === "active" && !canPublish(merchant)) {
    return NextResponse.json({ error: "Your merchant account must be verified before publishing products" }, { status: 403 });
  }

  const { data: updated, error } = await supabase
    .from("products")
    .update(toProductRow(parsed.data))
    .eq("id", id)
    .select(PRODUCT_COLUMNS)
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? "Unable to update product" }, { status: 500 });
  }

  await logActivity(supabase, {
    actorId: userId,
    action: "product_updated",
    targetType: "product",
    targetId: id,
    metadata: { fields: Object.keys(parsed.data), from: product.status, to: updated.status },
  });

  return NextResponse.json({ product: updated });
}

/** Soft delete: products are archived so historical order_items keep resolving. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const context = await requireOwnedProduct(id);
  if (!context.ok) {
    return context.response;
  }

  const { supabase, userId, product } = context;

  if (product.status === "archived") {
    return NextResponse.json({ error: "Product is already archived" }, { status: 409 });
  }

  const { error } = await supabase.from("products").update({ status: "archived" }).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity(supabase, {
    actorId: userId,
    action: "product_archived",
    targetType: "product",
    targetId: id,
    metadata: { from: product.status },
  });

  return NextResponse.json({ ok: true });
}
