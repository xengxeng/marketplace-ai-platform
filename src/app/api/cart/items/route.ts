import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const { productId, quantity } = await request.json();
    const qty = Number.isFinite(quantity) && quantity > 0 ? Math.min(Math.floor(quantity), 1000) : 1;

    if (typeof productId !== "string" || !UUID_PATTERN.test(productId)) {
      return NextResponse.json({ error: "Invalid productId" }, { status: 400 });
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

    let cart: { id: string } | null = null;

    const { data: existingCart, error: cartError } = await supabase
      .from("carts")
      .select("id")
      .eq("customer_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (cartError) {
      return NextResponse.json({ error: cartError.message }, { status: 500 });
    }

    cart = existingCart;

    if (!cart) {
      const { data: newCart, error: createError } = await supabase
        .from("carts")
        .insert({ customer_id: userId })
        .select("id")
        .single();

      if (createError || !newCart) {
        return NextResponse.json({ error: createError?.message ?? "Unable to create cart" }, { status: 500 });
      }
      cart = newCart;
    }

    const { data: existingItem } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", cart.id)
      .eq("product_id", productId)
      .maybeSingle();

    if (existingItem) {
      const { error: updateError } = await supabase
        .from("cart_items")
        .update({ quantity: existingItem.quantity + qty, updated_at: new Date().toISOString() })
        .eq("id", existingItem.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabase
        .from("cart_items")
        .insert({ cart_id: cart.id, product_id: productId, quantity: qty });

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
