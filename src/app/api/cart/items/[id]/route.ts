import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { withErrorHandling } from "@/lib/api/handler";
import { logError } from "@/lib/observability/log";

const SCOPE = "api/cart/items/[id]";

export const DELETE = withErrorHandling(SCOPE, async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: deleted, error } = await supabase.from("cart_items").delete().eq("id", id).select("id");

  if (error) {
    logError(SCOPE, error, { cartItemId: id, step: "delete_item" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // A delete that matches nothing (unknown id, or blocked by row-level
  // security) otherwise reports success while the item stays in the cart.
  if (!deleted || deleted.length === 0) {
    return NextResponse.json({ error: "Cart item not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
});
