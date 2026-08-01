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

  // Verify merchant ownership and verification status
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, status")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!merchant) {
    return NextResponse.json({ error: "Merchant record not found" }, { status: 404 });
  }

  if (merchant.status !== "verified") {
    return NextResponse.json({ error: "Only verified merchants can publish products" }, { status: 403 });
  }

  // Verify product ownership
  const { data: product } = await supabase
    .from("products")
    .select("id, merchant_id, status, name, price_cents, stock_int")
    .eq("id", id)
    .maybeSingle();

  if (!product || product.merchant_id !== merchant.id) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (!product.name || product.price_cents <= 0) {
    return NextResponse.json({ error: "Product must have a name and a valid price before publishing" }, { status: 400 });
  }

  // Cannot publish a product that's already active
  if (product.status === "active") {
    return NextResponse.json({ error: "Product is already published" }, { status: 409 });
  }

  const { error } = await supabase
    .from("products")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
