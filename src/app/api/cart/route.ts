import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/responses";
import { guardFailed, requireUser } from "@/lib/api/guards";
import { relatedRecord } from "@/lib/supabase/relations";

type ProductJoin = { name: string; price_cents: number; stock_int: number };

export async function GET() {
  const guard = await requireUser();

  if (guardFailed(guard)) {
    return guard.response;
  }

  const { supabase, user } = guard;

  const { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("customer_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!cart) {
    return NextResponse.json({ cartId: null, items: [], totalCents: 0 });
  }

  const { data: items, error } = await supabase
    .from("cart_items")
    .select("id, quantity, product_id, products(name, price_cents, stock_int)")
    .eq("cart_id", cart.id)
    .order("created_at", { ascending: true });

  if (error) {
    return apiError(error.message, 500);
  }

  const normalized = (items ?? []).map((row) => {
    const product = relatedRecord(row.products as ProductJoin | ProductJoin[] | null);
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
}
