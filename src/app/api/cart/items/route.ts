import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { readJsonBody } from "@/lib/api/json";
import { withErrorHandling } from "@/lib/api/handler";
import { logError } from "@/lib/observability/log";

const SCOPE = "api/cart/items";

export const POST = withErrorHandling(SCOPE, async (request: Request) => {
  const parsed = await readJsonBody<{ productId?: unknown; quantity?: unknown }>(request, SCOPE);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { productId, quantity } = parsed.data;
  const qty = typeof quantity === "number" && Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;

  if (typeof productId !== "string" || productId.length === 0) {
    return NextResponse.json({ error: "Missing productId" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const userId = userData.user.id;

  const { data: existingCart, error: cartError } = await supabase
    .from("carts")
    .select("id")
    .eq("customer_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (cartError) {
    logError(SCOPE, cartError, { userId, step: "fetch_cart" });
    return NextResponse.json({ error: cartError.message }, { status: 500 });
  }

  let cart = existingCart;

  if (!cart) {
    const { data: newCart, error: createError } = await supabase
      .from("carts")
      .insert({ customer_id: userId })
      .select("id")
      .single();

    if (createError || !newCart) {
      logError(SCOPE, createError ?? new Error("insert returned no row"), { userId, step: "create_cart" });
      return NextResponse.json({ error: createError?.message ?? "Unable to create cart" }, { status: 500 });
    }
    cart = newCart;
  }

  const { data: existingItem, error: existingItemError } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cart.id)
    .eq("product_id", productId)
    .maybeSingle();

  // Treating a failed lookup as "no existing row" would insert a duplicate line
  // for the same product, so surface it instead.
  if (existingItemError) {
    logError(SCOPE, existingItemError, { cartId: cart.id, productId, step: "fetch_item" });
    return NextResponse.json({ error: existingItemError.message }, { status: 500 });
  }

  if (existingItem) {
    const { error: updateError } = await supabase
      .from("cart_items")
      .update({ quantity: existingItem.quantity + qty, updated_at: new Date().toISOString() })
      .eq("id", existingItem.id);

    if (updateError) {
      logError(SCOPE, updateError, { cartItemId: existingItem.id, step: "update_item" });
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  } else {
    const { error: insertError } = await supabase
      .from("cart_items")
      .insert({ cart_id: cart.id, product_id: productId, quantity: qty });

    if (insertError) {
      logError(SCOPE, insertError, { cartId: cart.id, productId, step: "insert_item" });
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
});
