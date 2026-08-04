import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity/log";
import { createProductSchema, firstIssue, toProductRow } from "@/lib/products/input";
import { canPublish, getOwnedMerchant } from "@/lib/products/merchant";

const PRODUCT_COLUMNS = "id, name, description, category, image_url, price_cents, stock_int, status, created_at";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const merchant = await getOwnedMerchant(supabase, userData.user.id);
  if (!merchant) {
    return NextResponse.json({ error: "No merchant application found" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ products: data ?? [], merchantStatus: merchant.status });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const merchant = await getOwnedMerchant(supabase, userData.user.id);
  if (!merchant) {
    return NextResponse.json({ error: "No merchant application found" }, { status: 403 });
  }

  if (parsed.data.status === "active" && !canPublish(merchant)) {
    return NextResponse.json({ error: "Your merchant account must be verified before publishing products" }, { status: 403 });
  }

  const { data: product, error } = await supabase
    .from("products")
    .insert({ ...toProductRow(parsed.data), merchant_id: merchant.id })
    .select(PRODUCT_COLUMNS)
    .single();

  if (error || !product) {
    return NextResponse.json({ error: error?.message ?? "Unable to create product" }, { status: 500 });
  }

  await logActivity(supabase, {
    actorId: userData.user.id,
    action: "product_created",
    targetType: "product",
    targetId: product.id,
    metadata: { name: parsed.data.name, status: parsed.data.status },
  });

  return NextResponse.json({ product }, { status: 201 });
}
