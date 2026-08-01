import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/require-role";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, role } = await getSessionProfile();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (role !== "merchant" && role !== "admin" && role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!merchant) {
    return NextResponse.json({ error: "Merchant record not found" }, { status: 404 });
  }

  const { data: product } = await supabase
    .from("products")
    .select("id, merchant_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!product || product.merchant_id !== merchant.id) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (product.status === "archived") {
    return NextResponse.json({ error: "Product is already archived" }, { status: 409 });
  }

  const { error } = await supabase
    .from("products")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
