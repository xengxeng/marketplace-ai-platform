import { NextResponse } from "next/server";
import { apiError, unexpectedError } from "@/lib/api/responses";
import { guardFailed, requireUser } from "@/lib/api/guards";

export async function POST(request: Request) {
  try {
    const { productId, quantity } = await request.json();
    const qty = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;

    if (!productId) {
      return apiError("Missing productId", 400);
    }

    const guard = await requireUser();

    if (guardFailed(guard)) {
      return guard.response;
    }

    const { supabase, user } = guard;

    let cart: { id: string } | null = null;

    const { data: existingCart, error: cartError } = await supabase
      .from("carts")
      .select("id")
      .eq("customer_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (cartError) {
      return apiError(cartError.message, 500);
    }

    cart = existingCart;

    if (!cart) {
      const { data: newCart, error: createError } = await supabase
        .from("carts")
        .insert({ customer_id: user.id })
        .select("id")
        .single();

      if (createError || !newCart) {
        return apiError(createError?.message ?? "Unable to create cart", 500);
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
        return apiError(updateError.message, 500);
      }
    } else {
      const { error: insertError } = await supabase
        .from("cart_items")
        .insert({ cart_id: cart.id, product_id: productId, quantity: qty });

      if (insertError) {
        return apiError(insertError.message, 500);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return unexpectedError(error);
  }
}
