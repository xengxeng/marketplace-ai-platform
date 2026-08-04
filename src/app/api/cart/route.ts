import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logError } from "@/lib/observability/log";
import { withErrorHandling } from "@/lib/api/handler";

const SCOPE = "api/cart";

type ProductJoin = { name: string; price_cents: number; stock_int: number };

export const GET = withErrorHandling(SCOPE, async () => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: cart, error: cartError } = await supabase
    .from("carts")
    .select("id")
    .eq("customer_id", userData.user.id)
    .eq("status", "active")
    .maybeSingle();

  // Without this check a lookup failure is indistinguishable from "no cart",
  // so the shopper would be shown an empty cart instead of an error.
  if (cartError) {
    logError(SCOPE, cartError, { userId: userData.user.id, step: "fetch_cart" });
    return NextResponse.json({ error: cartError.message }, { status: 500 });
  }

  if (!cart) {
    return NextResponse.json({ cartId: null, items: [], totalCents: 0 });
  }

  const { data: items, error } = await supabase
    .from("cart_items")
    .select("id, quantity, product_id, products(name, price_cents, stock_int)")
    .eq("cart_id", cart.id)
    .order("created_at", { ascending: true });

  if (error) {
    logError(SCOPE, error, { cartId: cart.id, step: "fetch_items" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const normalized = (items ?? []).map((row) => {
    const product = (Array.isArray(row.products) ? row.products[0] : row.products) as ProductJoin | undefined;
    const priceCents = product?.price_cents ?? 0;
    return {
      id: row.id,
      productId: row.product_id,
      name: product?.name ?? "Unknown product",
      priceCents,
      stock: product?.stock_int ?? 0,
      quantity: row.quantity,
      subtotalCents: priceCents * row.quantity,
    };
  });

  const totalCents = normalized.reduce((sum, item) => sum + item.subtotalCents, 0);

  return NextResponse.json({ cartId: cart.id, items: normalized, totalCents });
});
