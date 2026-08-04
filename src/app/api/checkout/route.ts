import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity/log";
import { formatShippingAddress, shippingAddressSchema } from "@/lib/checkout/address";
import { firstIssue } from "@/lib/validation/issue";
import { REFERRAL_COOKIE, normalizeReferralCode } from "@/lib/resellers/referral";

type MinimalSupabase = Awaited<ReturnType<typeof createServerSupabaseClient>>;

/**
 * Resolves the referral cookie to an active reseller's profile id. Returns null
 * for an unknown, suspended or self-referral code so checkout still succeeds
 * without a commission rather than failing.
 */
async function resolveReseller(supabase: NonNullable<MinimalSupabase>, request: Request, customerId: string) {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${REFERRAL_COOKIE}=`));

  const code = normalizeReferralCode(cookie?.slice(REFERRAL_COOKIE.length + 1));
  if (!code) {
    return null;
  }

  // Read through the `reseller_referrals` security-definer view: RLS on
  // `resellers` only exposes a row to its owner, but the shopper resolving a
  // code is by definition somebody else.
  const { data: reseller } = await supabase
    .from("reseller_referrals")
    .select("profile_id, status")
    .eq("referral_code", code)
    .maybeSingle();

  if (!reseller || reseller.status !== "active" || reseller.profile_id === customerId) {
    return null;
  }

  return reseller.profile_id as string;
}

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

  const resellerId = await resolveReseller(supabase, request, userData.user.id);

  const { data: orderId, error } = await supabase.rpc("place_order", {
    p_customer_id: userData.user.id,
    p_reseller_id: resellerId,
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
