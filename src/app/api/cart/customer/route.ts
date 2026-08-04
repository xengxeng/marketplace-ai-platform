import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getResellerForUser } from "@/lib/reseller/current";

// Attaches (or re-attributes) the customer a reseller is buying for to their
// active cart. Re-attribution never clears line items (Module 12, rule 8).
export async function PATCH(request: Request) {
  const { customerId } = await request.json();

  if (!customerId || typeof customerId !== "string") {
    return NextResponse.json({ error: "Missing customerId" }, { status: 400 });
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

  const reseller = await getResellerForUser(supabase, userId);
  if (!reseller) {
    return NextResponse.json({ error: "No reseller account" }, { status: 403 });
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .eq("reseller_id", reseller.id)
    .maybeSingle();

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const { data: existingCart } = await supabase
    .from("carts")
    .select("id")
    .eq("customer_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (existingCart) {
    const { error } = await supabase
      .from("carts")
      .update({ for_customer_id: customerId, updated_at: new Date().toISOString() })
      .eq("id", existingCart.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, cartId: existingCart.id });
  }

  const { data: newCart, error: createError } = await supabase
    .from("carts")
    .insert({ customer_id: userId, for_customer_id: customerId })
    .select("id")
    .single();

  if (createError || !newCart) {
    return NextResponse.json({ error: createError?.message ?? "Unable to create cart" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, cartId: newCart.id });
}
