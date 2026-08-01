import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/require-role";

export async function GET() {
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

  // Get the merchant record for this user
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, status")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!merchant) {
    return NextResponse.json({ error: "Merchant record not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("products")
    .select("id, name, description, category, category_id, sku, price_cents, compare_at_price_cents, stock_int, low_stock_threshold, image_url, status, created_at, updated_at")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ products: data ?? [], merchantStatus: merchant.status });
}

export async function POST(request: Request) {
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

  // Get the merchant record
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, status")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!merchant) {
    return NextResponse.json({ error: "Merchant record not found" }, { status: 404 });
  }

  if (merchant.status !== "verified") {
    return NextResponse.json({ error: "Merchant account is not verified" }, { status: 403 });
  }

  const body = await request.json();
  const { name, description, category_id, sku, price_cents, compare_at_price_cents, stock_int, low_stock_threshold, image_url } = body;

  if (!name || typeof name !== "string" || name.trim().length < 1) {
    return NextResponse.json({ error: "Product name is required" }, { status: 400 });
  }

  const price = Number.isFinite(price_cents) ? price_cents : 0;
  if (price <= 0) {
    return NextResponse.json({ error: "Price must be greater than 0" }, { status: 400 });
  }

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      merchant_id: merchant.id,
      name: name.trim(),
      description: description ?? null,
      category_id: category_id ?? null,
      sku: sku ?? null,
      price_cents: price,
      compare_at_price_cents: compare_at_price_cents ?? null,
      stock_int: Number.isFinite(stock_int) ? Math.max(0, Math.floor(stock_int)) : 0,
      low_stock_threshold: Number.isFinite(low_stock_threshold) ? Math.max(0, Math.floor(low_stock_threshold)) : 5,
      image_url: image_url ?? null,
      status: "draft",
    })
    .select("id, name, status, created_at")
    .single();

  if (error || !product) {
    return NextResponse.json({ error: error?.message ?? "Unable to create product" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, product });
}
