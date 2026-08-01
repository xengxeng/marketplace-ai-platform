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

  // Get the merchant record
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!merchant) {
    return NextResponse.json({ error: "Merchant record not found" }, { status: 404 });
  }

  // Fetch orders that contain this merchant's products, with items and product info
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id, customer_id, status, total_cents, tracking_number, carrier, created_at, updated_at
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter to only orders containing this merchant's products
  const orders = (data ?? []).filter((order) => order.id); // RLS handles the filtering via orders_select_merchant policy

  // Fetch order_items for these orders
  const orderIds = orders.map((o) => o.id);
  const { data: items } = orderIds.length > 0
    ? await supabase
        .from("order_items")
        .select("id, order_id, product_id, quantity, unit_price_cents, subtotal_cents")
        .in("order_id", orderIds)
    : { data: [] };

// Group items by order_id
  const itemsByOrder: Record<string, { id: string; order_id: string; product_id: string; quantity: number; unit_price_cents: number; subtotal_cents: number }[]> = {};
  for (const item of items ?? []) {
    if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
    itemsByOrder[item.order_id].push(item);
  }

  // Fetch status history for these orders
  const { data: history } = orderIds.length > 0
    ? await supabase
        .from("order_status_history")
        .select("id, order_id, from_status, to_status, actor_role, created_at")
        .in("order_id", orderIds)
        .order("created_at", { ascending: true })
    : { data: [] };

  const historyByOrder: Record<string, { id: string; order_id: string; from_status: string | null; to_status: string; actor_role: string; created_at: string }[]> = {};
  for (const h of history ?? []) {
    if (!historyByOrder[h.order_id]) historyByOrder[h.order_id] = [];
    historyByOrder[h.order_id].push(h);
  }

  const enriched = orders.map((order) => ({
    ...order,
    items: itemsByOrder[order.id] ?? [],
    history: historyByOrder[order.id] ?? [],
  }));

  return NextResponse.json({ orders: enriched });
}
