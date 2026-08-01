import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/require-role";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  // Verify ownership
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
    .select("id, merchant_id")
    .eq("id", id)
    .maybeSingle();

  if (!product || product.merchant_id !== merchant.id) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const body = await request.json();
  const allowedFields = ["name", "description", "category_id", "sku", "price_cents", "compare_at_price_cents", "stock_int", "low_stock_threshold", "image_url"];
  const updates: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (field in body) {
      const value = body[field];
      if (field === "price_cents" && (!Number.isFinite(value) || value <= 0)) {
        return NextResponse.json({ error: "Price must be greater than 0" }, { status: 400 });
      }
      if (field === "stock_int" && Number.isFinite(value)) {
        updates[field] = Math.max(0, Math.floor(value));
      } else if (field === "low_stock_threshold" && Number.isFinite(value)) {
        updates[field] = Math.max(0, Math.floor(value));
      } else if (field === "name" && (typeof value !== "string" || value.trim().length < 1)) {
        return NextResponse.json({ error: "Product name is required" }, { status: 400 });
      } else {
        updates[field] = value;
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { error } = await supabase.from("products").update(updates).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    .select("id, merchant_id")
    .eq("id", id)
    .maybeSingle();

  if (!product || product.merchant_id !== merchant.id) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Soft-delete: set to archived
  const { error } = await supabase
    .from("products")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
