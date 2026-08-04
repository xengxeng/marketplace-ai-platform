import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ProductJoin = { name: string; price_cents: number; stock_int: number };
type CustomerJoin = { id: string; name: string; phone: string };

export async function GET() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: cart } = await supabase
    .from("carts")
    .select("id, for_customer_id, customers(id, name, phone)")
    .eq("customer_id", userData.user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!cart) {
    return NextResponse.json({ cartId: null, items: [], totalCents: 0, forCustomer: null });
  }

  const forCustomer =
    ((Array.isArray(cart.customers) ? cart.customers[0] : cart.customers) as CustomerJoin | undefined) ?? null;

  const { data: items, error } = await supabase
    .from("cart_items")
    .select("id, quantity, product_id, products(name, price_cents, stock_int)")
    .eq("cart_id", cart.id)
    .order("created_at", { ascending: true });

  if (error) {
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

  return NextResponse.json({ cartId: cart.id, items: normalized, totalCents, forCustomer });
}
