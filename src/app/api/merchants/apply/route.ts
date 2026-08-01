import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity/log";

export async function POST(request: Request) {
  const { businessName } = await request.json();

  if (!businessName || typeof businessName !== "string" || businessName.trim().length < 2) {
    return NextResponse.json({ error: "Business name is required" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: existing } = await supabase.from("merchants").select("id").eq("owner_id", userData.user.id).maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "You already have a merchant application" }, { status: 409 });
  }

  const { data: merchant, error } = await supabase
    .from("merchants")
    .insert({ owner_id: userData.user.id, business_name: businessName.trim(), status: "pending" })
    .select("id")
    .single();

  if (error || !merchant) {
    return NextResponse.json({ error: error?.message ?? "Unable to create merchant application" }, { status: 500 });
  }

  await supabase.from("profiles").update({ role: "merchant" }).eq("id", userData.user.id);

  await logActivity(supabase, {
    actorId: userData.user.id,
    action: "merchant_applied",
    targetType: "merchant",
    targetId: merchant.id,
    metadata: { businessName },
  });

  return NextResponse.json({ ok: true, merchantId: merchant.id });
}
