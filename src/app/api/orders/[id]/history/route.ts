import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/require-role";

/**
 * Status timeline for one order. Readable by the customer, the attributed
 * reseller and staff — RLS on `order_status_history` mirrors `orders`, so a
 * non-participant simply sees an empty timeline rather than someone else's.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getSessionProfile();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("order_status_history")
    .select("id, from_status, to_status, changed_by, created_at")
    .eq("order_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ history: data ?? [] });
}
