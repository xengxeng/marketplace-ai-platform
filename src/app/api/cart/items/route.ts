import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getResellerForUser } from "@/lib/reseller/current";

export async function POST(request: Request) {
  try {
    const { productId, quantity, customerId } = await request.json();
    const qty = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;

    if (!productId) {
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

    const reseller = await getResellerForUser(supabase, userId);

    let cart: { id: string; for_customer_id: string | null } | null = null;

    const { data: existingCart, error: cartError } = await supabase
      .from("carts")
      .select("id, for_customer_id")
      .eq("customer_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (cartError) {
      return NextResponse.json({ error: cartError.message }, { status: 500 });
    }

    cart = existingCart;

    // A reseller always buys on behalf of one of their own customers, so the
    // API rejects an unattributed add regardless of what the UI did or didn't
    // show (Module 12, rule 2).
    let forCustomerId: string | null = cart?.for_customer_id ?? null;

    if (reseller) {
      if (typeof customerId === "string" && customerId) {
        const { data: owned } = await supabase
          .from("customers")
          .select("id")
          .eq("id", customerId)
          .eq("reseller_id", reseller.id)
          .maybeSingle();

        if (!owned) {
          return NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }

        forCustomerId = customerId;
      }

      if (!forCustomerId) {
        return NextResponse.json({ error: "Select a customer to buy for first", code: "customer_required" }, { status: 422 });
      }

      if (reseller.verification_status !== "approved") {
        return NextResponse.json(
          { error: "Your reseller account is not verified yet", code: "verification_required" },
          { status: 403 },
        );
      }
    }

    if (!cart) {
      const { data: newCart, error: createError } = await supabase
        .from("carts")
        .insert({ customer_id: userId, for_customer_id: forCustomerId })
        .select("id, for_customer_id")
        .single();

      if (createError || !newCart) {
        return NextResponse.json({ error: createError?.message ?? "Unable to create cart" }, { status: 500 });
      }
      cart = newCart;
    } else if (forCustomerId && forCustomerId !== cart.for_customer_id) {
      const { error: attributeError } = await supabase
        .from("carts")
        .update({ for_customer_id: forCustomerId, updated_at: new Date().toISOString() })
        .eq("id", cart.id);

      if (attributeError) {
        return NextResponse.json({ error: attributeError.message }, { status: 500 });
      }
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
