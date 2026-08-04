import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity/log";
import { formatShippingAddress, shippingAddressSchema } from "@/lib/checkout/address";
import { firstIssue } from "@/lib/validation/issue";

type MerchantJoin = { status: string };
type ProductJoin = { name: string; status: string; merchants: MerchantJoin | MerchantJoin[] | null };
type CartLine = { quantity: number; products: ProductJoin | ProductJoin[] | null };

/** Supabase types nested joins as arrays even when they resolve to one row. */
function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = shippingAddressSchema.safeParse((body as { shippingAddress?: unknown })?.shippingAddress);
  if (!parsed.success) {
    return NextResponse.json({ error: `Shipping address — ${firstIssue(parsed.error)}` }, { status: 400 });
  }

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
    .select("id")
    .eq("customer_id", userData.user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!cart) {
    return NextResponse.json({ error: "Your cart is empty" }, { status: 400 });
  }

  // A merchant can be suspended (or a product archived) after the item was
  // added, and place_order only validates stock — so gate it here rather than
  // letting an unsellable line through checkout.
  const { data: lines } = await supabase
    .from("cart_items")
    .select("quantity, products(name, status, merchants(status))")
    .eq("cart_id", cart.id);

  const blocked = ((lines ?? []) as unknown as CartLine[])
    .map((line) => one(line.products))
    .filter((product) => product?.status !== "active" || one(product?.merchants)?.status !== "verified");

  if (blocked.length > 0) {
    const names = blocked.map((product) => product?.name ?? "an item").join(", ");
    return NextResponse.json(
      { error: `These items are no longer available from a verified merchant: ${names}. Remove them to continue.` },
      { status: 409 },
    );
  }

  const { data: orderId, error } = await supabase.rpc("place_order", {
    p_customer_id: userData.user.id,
    p_reseller_id: null,
    p_shipping_address: formatShippingAddress(parsed.data),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logActivity(supabase, {
    actorId: userData.user.id,
    action: "order_placed",
    targetType: "order",
    targetId: orderId,
  });

  return NextResponse.json({ orderId });
}
