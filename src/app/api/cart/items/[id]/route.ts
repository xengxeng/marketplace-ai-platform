import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CartItemRow = {
  id: string;
  quantity: number;
  product_id: string;
  cart_id: string;
};

/**
 * Loads the cart item only if it hangs off the caller's own active cart. RLS
 * already prevents cross-customer writes, but resolving it here turns what
 * would be a silent zero-row update into an explicit 404.
 */
async function requireOwnCartItem(
  supabase: SupabaseClient,
  userId: string,
  itemId: string,
): Promise<CartItemRow | null> {
  const { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("customer_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!cart) {
    return null;
  }

  const { data: item } = await supabase
    .from("cart_items")
    .select("id, quantity, product_id, cart_id")
    .eq("id", itemId)
    .eq("cart_id", cart.id)
    .maybeSingle();

  return (item as CartItemRow | null) ?? null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let quantity: unknown;
  try {
    ({ quantity } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) {
    return NextResponse.json({ error: "Quantity must be a whole number of at least 1" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const item = await requireOwnCartItem(supabase, userData.user.id, id);
  if (!item) {
    return NextResponse.json({ error: "Cart item not found" }, { status: 404 });
  }

  const { data: product } = await supabase
    .from("products")
    .select("stock_int, status")
    .eq("id", item.product_id)
    .maybeSingle();

  if (!product) {
    return NextResponse.json({ error: "Product is no longer available" }, { status: 409 });
  }

  if (quantity > product.stock_int) {
    return NextResponse.json({ error: `Only ${product.stock_int} left in stock` }, { status: 409 });
  }

  const { error } = await supabase
    .from("cart_items")
    .update({ quantity, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, quantity });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { error } = await supabase.from("cart_items").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
